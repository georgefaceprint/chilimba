require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const path = require('path');

// Import Controllers and Middleware
const authController = require('./backend/auth');
const paymentsController = require('./backend/payments');
const { authorizeRoute, ROLES } = require('./backend/rbac');
const db = require('./backend/db');

const app = express();
app.use(express.static(path.join(__dirname, 'public')));
// SPA catch-all moved to the bottom
app.use(cors({ origin: ['https://chilimba-pwa.vercel.app','https://chilimba-kv32tixjo-georgefaceprints-projects.vercel.app'], credentials: true }));
app.use(express.json());
app.use(cookieParser());

// --- ROUTES ---

// 1. Authentication Routes
app.post('/api/v1/auth/google/callback', authController.handleGoogleAuthCallback);
app.post('/api/v1/auth/whatsapp/initiate', authController.initiateWhatsAppVerification);
app.post('/api/v1/auth/whatsapp/verify', authController.verifyWhatsAppOTP);

app.get('/api/v1/auth/me', (req, res) => {
  const token = req.cookies.auth_token;
  if (!token) return res.status(401).json({ authenticated: false });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    res.json({ authenticated: true, user: decoded });
  } catch (err) {
    res.status(401).json({ authenticated: false });
  }
});

app.post('/api/v1/auth/logout', (req, res) => {
  res.clearCookie('auth_token');
  res.json({ success: true });
});

// 2. Payment Routes
app.post('/api/v1/payments/initiate', paymentsController.initiateMobileMoneyPayment);
app.post('/api/v1/payments/lenco-callback', paymentsController.handleLencoCallback);
app.post('/payments/lenco-callback', paymentsController.handleLencoCallback); // Fallback for the integration test script

// 3. Catalog Routes
app.get('/api/v1/products', async (req, res) => {
  try {
    const products = await require('./backend/firestore').query('products');
    res.json({ success: true, products });
  } catch (error) {
    console.error('[Products API] Firestore error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. Tracking/Logistics Routes 
app.post('/api/v1/products/upload', async (req, res) => {
  try {
    const { title, description, price_tzs, price_zmw_input, weight_kg, origin_city, origin_country, image_url, supplier_name, supplier_id } = req.body;
    
    let finalPriceZmw = 0;
    
    if (origin_country === 'Zambia') {
      // Local stock: No forex, no markup, direct ZMW input
      finalPriceZmw = parseFloat(price_zmw_input);
    } else {
      // International stock (Tanzania, SA): Forex calculation: TZS -> ZMW
      const tzsRate = parseFloat(process.env.TZS_TO_ZMW_RATE) || 0.0105;
      const markup = parseFloat(process.env.FOREX_MARKUP_PERCENTAGE) || 0.05; // 5%
      
      const basePriceZmw = price_tzs * tzsRate;
      finalPriceZmw = basePriceZmw * (1 + markup);
    }
    
    const newProduct = {
      title,
      description,
      price_tzs: origin_country === 'Zambia' ? 0 : price_tzs,
      price_zmw: Math.ceil(finalPriceZmw),
      weight_kg,
      origin_country: origin_country || 'Tanzania',
      origin_city,
      image_urls: [image_url],
      supplier_name,
      supplier_id,
      trust_rating: 4.8 + (Math.random() * 0.2), // Random 4.8 - 5.0 for demo
      is_local_stock: origin_country === 'Zambia',
      created_at: new Date().toISOString()
    };
    
    const { db } = require('./backend/firestore');
    const docRef = await db.collection('products').add(newProduct);
    
    res.json({ success: true, product_id: docRef.id });
  } catch (error) {
    console.error('[Products Upload API] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});


// 5. Logistics Tracking & QR Scanner Routes
app.post('/api/v1/tracking/scan', async (req, res) => {
  try {
    const { order_id, location, scanned_by } = req.body;
    const { db } = require('./backend/firestore');
    
    // Default flow: SOURCED_IN_TZ -> ARRIVED_AT_BORDER -> IN_TRANSIT_ZAMBIA -> READY_FOR_PICKUP -> COLLECTED
    const orderRef = db.collection('logistics_tracking').doc(order_id);
    const doc = await orderRef.get();
    
    let current_status = 'SOURCED_IN_TZ';
    let next_status = 'ARRIVED_AT_BORDER';
    
    if (doc.exists) {
      current_status = doc.data().current_status;
      if (current_status === 'SOURCED_IN_TZ') next_status = 'ARRIVED_AT_BORDER';
      else if (current_status === 'ARRIVED_AT_BORDER') next_status = 'IN_TRANSIT_ZAMBIA';
      else if (current_status === 'IN_TRANSIT_ZAMBIA') next_status = 'READY_FOR_PICKUP';
      else if (current_status === 'READY_FOR_PICKUP') next_status = 'COLLECTED';
      else next_status = current_status; // already collected
    }
    
    await orderRef.set({
      order_id,
      current_status: next_status,
      last_location: location,
      last_scanned_by: scanned_by,
      updated_at: new Date().toISOString()
    }, { merge: true });
    
    res.json({ success: true, new_status: next_status });
  } catch (error) {
    console.error('[QR Scan API] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/v1/tracking/order/:id', async (req, res) => {
  try {
    const { db } = require('./backend/firestore');
    const doc = await db.collection('logistics_tracking').doc(req.params.id).get();
    if (!doc.exists) return res.json({ current_status: 'UNKNOWN' });
    res.json(doc.data());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 6. Multi-Tenancy / Micro-Group Routes (Phase 4)
app.get('/api/v1/groups/check-name', async (req, res) => {
  try {
    const { name } = req.query;
    const { db } = require('./backend/firestore');
    // Check if any group has this name
    const snapshot = await db.collection('groups').where('name', '==', name).limit(1).get();
    res.json({ available: snapshot.empty });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/v1/groups/create', async (req, res) => {
  try {
    const { name, admin_id } = req.body;
    const { db } = require('./backend/firestore');
    
    // Double check availability
    const snapshot = await db.collection('groups').where('name', '==', name).limit(1).get();
    if (!snapshot.empty) return res.status(400).json({ error: 'Name already taken' });
    
    // Generate 6-char invite code
    const invite_code = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const newGroup = {
      name,
      admin_id,
      invite_code,
      status: 'PENDING_FIRST_ORDER',
      member_count: 1, // Admin is member 1
      max_members: 20,
      created_at: new Date().toISOString()
    };
    
    const docRef = await db.collection('groups').add(newGroup);
    
    // Add to user_groups mapping
    await db.collection('user_groups').add({
      user_id: admin_id,
      group_id: docRef.id,
      role: 'ADMIN',
      joined_at: new Date().toISOString()
    });
    
    res.json({ success: true, group_id: docRef.id, invite_code });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/v1/groups/join', async (req, res) => {
  try {
    const { user_id, invite_code } = req.body;
    const { db } = require('./backend/firestore');
    
    const snapshot = await db.collection('groups').where('invite_code', '==', invite_code).limit(1).get();
    if (snapshot.empty) return res.status(404).json({ error: 'Invalid invite code' });
    
    const groupDoc = snapshot.docs[0];
    const groupData = groupDoc.data();
    
    if (groupData.member_count >= groupData.max_members) {
      return res.status(400).json({ error: 'This Chilimba is full!' });
    }
    
    // Check if already in group
    const userGroupSnap = await db.collection('user_groups')
      .where('user_id', '==', user_id)
      .where('group_id', '==', groupDoc.id)
      .get();
      
    if (!userGroupSnap.empty) return res.status(400).json({ error: 'You are already in this group' });
    
    // Add user to group
    await db.collection('user_groups').add({
      user_id,
      group_id: groupDoc.id,
      role: 'MEMBER',
      joined_at: new Date().toISOString()
    });
    
    // Increment member count
    await groupDoc.ref.update({
      member_count: groupData.member_count + 1
    });
    
    res.json({ success: true, group_id: groupDoc.id, group_name: groupData.name });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/v1/groups/my-groups', async (req, res) => {
  try {
    const { user_id } = req.query;
    const { db } = require('./backend/firestore');
    
    const mappingSnap = await db.collection('user_groups').where('user_id', '==', user_id).get();
    const groupPromises = mappingSnap.docs.map(async (doc) => {
      const data = doc.data();
      const groupDoc = await db.collection('groups').doc(data.group_id).get();
      return { ...groupDoc.data(), id: groupDoc.id, my_role: data.role };
    });
    
    const groups = await Promise.all(groupPromises);
    res.json({ groups });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// 7. Cart / Micro-Savings Routes
app.post('/api/v1/cart/add', async (req, res) => {
  try {
    const { group_id, user_id, product_id, title, price_zmw, quantity, image_url } = req.body;
    const { db } = require('./backend/firestore');
    
    // Check if group exists
    const groupDoc = await db.collection('groups').doc(group_id).get();
    if (!groupDoc.exists) return res.status(404).json({ error: 'Group not found' });
    
    const cartRef = db.collection('groups').doc(group_id).collection('cart');
    const existingItem = await cartRef.where('product_id', '==', product_id).where('user_id', '==', user_id).limit(1).get();
    
    if (!existingItem.empty) {
      // Update quantity
      const itemDoc = existingItem.docs[0];
      await itemDoc.ref.update({
        quantity: itemDoc.data().quantity + quantity
      });
    } else {
      // Add new
      await cartRef.add({
        user_id,
        product_id,
        title,
        price_zmw,
        quantity,
        image_url,
        added_at: new Date().toISOString()
      });
    }
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/v1/cart/:group_id', async (req, res) => {
  try {
    const { group_id } = req.params;
    const { db } = require('./backend/firestore');
    
    const snapshot = await db.collection('groups').doc(group_id).collection('cart').get();
    const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    res.json({ items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/v1/cart/checkout', async (req, res) => {
  try {
    const { group_id, user_id } = req.body;
    const { db } = require('./backend/firestore');
    
    const groupDoc = await db.collection('groups').doc(group_id).get();
    if (!groupDoc.exists) return res.status(404).json({ error: 'Group not found' });
    
    // In MVP, we just change the group status to 'PENDING_PAYMENT' or 'ORDER_PLACED'
    await groupDoc.ref.update({
      status: 'ORDER_PLACED',
      updated_at: new Date().toISOString()
    });
    
    // Could optionally trigger Lenco from here instead of frontend
    
    res.json({ success: true });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Catch-all for SPA
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    res.sendFile(path.resolve(__dirname, 'public', 'index.html'));
  } else {
    next();
  }
});

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`✅ Chilimba Backend Server running on http://localhost:${PORT}`);
  });
}

// Export for Vercel serverless functions
module.exports = app;
