require('dotenv').config();
const { db } = require('./backend/firestore');
const crypto = require('crypto');

async function setupMusole() {
  try {
    const phoneNumber = '+260768488494';
    const passcode = '47183';
    const role = 'SUPER_ADMIN';

    const usersRef = db.collection('users');
    let snapshot = await usersRef.where('whatsapp', '==', phoneNumber).limit(1).get();
    
    // Fallback: search by name just in case she signed up with Google but hasn't linked phone
    if (snapshot.empty) {
      snapshot = await usersRef.where('display_name', '==', 'Musole Mutesi').limit(1).get();
    }
    
    const saltStr = 'chilimba_salt_2026';
    const passcodeHash = crypto.createHash('sha256').update(saltStr + passcode).digest('hex');

    const updateData = {
      role: role,
      account_status: 'ACTIVE',
      whatsapp: phoneNumber,
      is_phone_verified: true,
      passcode_hash: passcodeHash,
      display_name: 'Musole Mutesi'
    };

    if (!snapshot.empty) {
      const docId = snapshot.docs[0].id;
      await usersRef.doc(docId).update(updateData);
      console.log('Successfully updated existing account for Musole Mutesi (ID:', docId, ')');
    } else {
      updateData.created_at = new Date().toISOString();
      const newDoc = await usersRef.add(updateData);
      console.log('Successfully created NEW account for Musole Mutesi (ID:', newDoc.id, ')');
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

setupMusole();
