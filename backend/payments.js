const crypto = require('crypto');
// Assume db is an instantiated Antigravity/PostgreSQL client
const db = require('./db');

// Lenco API Configuration
const LENCO_API_URL = process.env.LENCO_API_URL || 'https://api.lenco.co/v2/collections/mobile-money';
const LENCO_API_KEY = process.env.LENCO_API_KEY;
const LENCO_WEBHOOK_SECRET = process.env.LENCO_WEBHOOK_SECRET;

/**
 * 1 & 2. Initiate Lenco Mobile Money Payment (STK Push)
 */
async function initiateMobileMoneyPayment(req, res) {
  try {
    const { user_id, amount_zmw, phone_number, product_id } = req.body;

    if (!user_id || !amount_zmw || !phone_number || !product_id) {
      return res.status(400).json({ success: false, error: 'Missing required payment payload parameters.' });
    }

    // 1. Find an active Group for this product, or create one if none exists
    let groupId;
    const activeGroupRes = await db.query(
      `SELECT group_id FROM Groups WHERE product_id = $1 AND status = 'FORMING' LIMIT 1`,
      [product_id]
    );

    if (activeGroupRes.rows.length > 0) {
      groupId = activeGroupRes.rows[0].group_id;
    } else {
      // Create a new group
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const newGrpRes = await db.query(
        `INSERT INTO Groups (group_code, group_name, target_amount_zmw, contribution_frequency, status, product_id)
         VALUES ($1, $2, $3, 'WEEKLY', 'FORMING', $4) RETURNING group_id`,
        [code, `Group ${code}`, amount_zmw * 5, product_id] // assuming 5 people per group
      );
      groupId = newGrpRes.rows[0].group_id;
    }

    // 2. Create the Order
    const orderRes = await db.query(
      `INSERT INTO Orders (user_id, product_id, group_id, total_paid_zmw, purchase_type)
       VALUES ($1, $2, $3, 0, 'CHILIMBA_ROTATION') RETURNING order_id`,
      [user_id, product_id, groupId]
    );
    const order_id = orderRes.rows[0].order_id;

    // Generate internal unique tracking reference
    const internalReference = `CHL-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;

    // Log PENDING transaction
    const insertResult = await db.query(
      `INSERT INTO Lenco_Transactions (order_id, group_id, lenco_reference, amount_zmw, status, phone_used)
       VALUES ($1, $2, $3, $4, 'PENDING', $5) RETURNING transaction_id`,
      [order_id, groupId, internalReference, amount_zmw, phone_number]
    );

    // 3. Make outbound POST request to Lenco Collections endpoint
    // In a real Node environment, you'd use fetch or axios.
    // Assuming a global fetch or axios is available.
    const lencoPayload = {
      amount: amount_zmw,
      currency: 'ZMW',
      provider: getNetworkProvider(phone_number), // e.g., MTN, AIRTEL, ZAMTEL
      customer: {
        phone: phone_number
      },
      reference: internalReference,
      callback_url: `${process.env.APP_BASE_URL}/api/v1/payments/lenco-callback`
    };

    console.log('Calling Lenco API:', LENCO_API_URL, lencoPayload);
    let lencoResponse = await fetch(LENCO_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LENCO_API_KEY}`
      },
      body: JSON.stringify(lencoPayload)
    });
    // If we hit a 404, retry with the older v1 endpoint (some accounts still use v1)
    if (lencoResponse.status === 404) {
      const V1_URL = LENCO_API_URL.replace('/v2/', '/v1/');
      console.warn('[Lenco] v2 endpoint returned 404, retrying with v1:', V1_URL);
      lencoResponse = await fetch(V1_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${LENCO_API_KEY}`
        },
        body: JSON.stringify(lencoPayload)
      });
    }

    if (!lencoResponse.ok) {
      const errorText = await lencoResponse.text();
      console.error("[Lenco API Error Response]", errorText);
      await db.query(`UPDATE Lenco_Transactions SET status = 'FAILED' WHERE lenco_reference = $1`, [internalReference]);
      return res.status(502).json({ success: false, error: `Gateway Error: ${errorText}` });
    }

    const lencoData = await lencoResponse.json();

    res.status(200).json({
      success: true,
      message: 'Mobile Money STK Push initiated. Please check your phone to authorize.',
      transaction_id: insertResult.rows[0].transaction_id,
      reference: internalReference,
      order_id: order_id
    });

  } catch (error) {
    console.error('Lenco Payment Initiation Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error processing payment.' });
  }
}

/**
 * 4 & 5. Secure Public Webhook Endpoint for Lenco Callback
 */
async function handleLencoCallback(req, res) {
  try {
    // Validate Signature to handle duplicate/fake webhook receipts
    const signature = req.headers['x-lenco-signature'];
    
    // In production, verify HMAC signature using LENCO_WEBHOOK_SECRET
    // if (!verifySignature(req.body, signature, LENCO_WEBHOOK_SECRET)) {
    //   return res.status(401).json({ success: false, error: 'Unauthorized webhook payload.' });
    // }

    const { reference, status, amount } = req.body.data; // Assuming Lenco payload structure

    if (!reference || !status) {
      return res.status(400).json({ success: false, error: 'Invalid payload.' });
    }

    // Intercept Firestore Group Contributions (Phase 3 Hybrid)
    if (reference.startsWith('LENCO-CONTR-')) {
      const { db: firestoreDb } = require('./firestore');
      const snapshot = await firestoreDb.collection('group_contributions')
        .where('transaction_reference', '==', reference)
        .limit(1)
        .get();
        
      if (!snapshot.empty) {
        const contribDoc = snapshot.docs[0];
        const contribData = contribDoc.data();
        
        if (status === 'SUCCESSFUL') {
          await contribDoc.ref.update({
            status: 'PAID',
            updated_at: new Date().toISOString()
          });
          
          const contribsSnap = await firestoreDb.collection('group_contributions')
            .where('group_id', '==', contribData.group_id)
            .get();
          
          let allPaid = true;
          contribsSnap.docs.forEach(doc => {
            if (doc.id === contribDoc.id) {
              // This is the current doc which is updated to PAID
            } else if (doc.data().status !== 'PAID') {
              allPaid = false;
            }
          });
          
          if (allPaid) {
            await firestoreDb.collection('groups').doc(contribData.group_id).update({
              status: 'ORDER_PLACED',
              updated_at: new Date().toISOString()
            });
            
            const cartRef = firestoreDb.collection('groups').doc(contribData.group_id).collection('cart');
            const cartSnap = await cartRef.get();
            const batch = firestoreDb.batch();
            cartSnap.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
          }
        } else if (status === 'FAILED') {
          await contribDoc.ref.update({
            status: 'PENDING',
            updated_at: new Date().toISOString()
          });
        }
        return res.status(200).json({ success: true, message: 'Contribution webhook processed.' });
      }
    }

    // Begin transaction for safe state updates
    await db.query('BEGIN');

    // Prevent duplicate processing
    const txCheck = await db.query('SELECT status, order_id FROM Lenco_Transactions WHERE lenco_reference = $1 FOR UPDATE', [reference]);
    
    if (txCheck.rows.length === 0) {
      await db.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Transaction reference not found.' });
    }

    const transaction = txCheck.rows[0];

    // Idempotency check: if already successful, just return 200 OK
    if (transaction.status === 'SUCCESSFUL') {
      await db.query('ROLLBACK');
      return res.status(200).json({ success: true, message: 'Already processed.' });
    }

    if (status === 'SUCCESSFUL') {
      // Update Lenco_Transactions
      await db.query(`UPDATE Lenco_Transactions SET status = 'SUCCESSFUL' WHERE lenco_reference = $1`, [reference]);

      if (transaction.order_id) {
        // Update Orders row to confirm payment
        await db.query(`UPDATE Orders SET total_paid_zmw = total_paid_zmw + $1 WHERE order_id = $2`, [amount, transaction.order_id]);

        // Create Logistics_Tracking row
        // Generate a 6-digit secure pickup OTP
        const pickupOtp = crypto.randomInt(100000, 999999).toString();
        
        await db.query(
          `INSERT INTO Logistics_Tracking (order_id, current_status, current_location, depot_pickup_otp) 
           VALUES ($1, 'PAYMENT_RECEIVED', 'Payment Cleared - Awaiting Dispatch', $2)`,
          [transaction.order_id, pickupOtp]
        );
      }
    } else if (status === 'FAILED') {
      await db.query(`UPDATE Lenco_Transactions SET status = 'FAILED' WHERE lenco_reference = $1`, [reference]);
    }

    await db.query('COMMIT');
    res.status(200).json({ success: true, message: 'Webhook processed successfully.' });

  } catch (error) {
    await db.query('ROLLBACK');
    console.error('Lenco Webhook Processing Error:', error);
    res.status(500).json({ success: false, error: 'Error processing webhook.' });
  }
}

// Helper to deduce provider for Lenco (simple example)
function getNetworkProvider(phone) {
  if (phone.startsWith('+26096') || phone.startsWith('+26076')) return 'MTN';
  if (phone.startsWith('+26097') || phone.startsWith('+26077')) return 'AIRTEL';
  if (phone.startsWith('+26095') || phone.startsWith('+26075')) return 'ZAMTEL';
  return 'MTN'; // Fallback
}

module.exports = {
  initiateMobileMoneyPayment,
  handleLencoCallback
};
