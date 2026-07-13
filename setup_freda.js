require('dotenv').config();
const { db } = require('./backend/firestore');
const crypto = require('crypto');

async function setupFreda() {
  try {
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('email', '==', 'fridaandrew668@gmail.com').get();
    
    if (snapshot.empty) {
      console.log('Freda not found!');
      process.exit(1);
    }

    const saltStr = 'chilimba_salt_2026';
    const passcodeHash = crypto.createHash('sha256').update(saltStr + '25258').digest('hex');

    // Update all matching documents just in case there's duplicates
    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, {
        role: 'AGENT',
        account_status: 'ACTIVE',
        whatsapp: '+255719594633',
        is_phone_verified: true,
        passcode_hash: passcodeHash
      });
      console.log('Updating document ID:', doc.id);
    });

    await batch.commit();
    console.log('Successfully set up Freda as an AGENT with passcode 25258.');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

setupFreda();
