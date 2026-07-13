require('dotenv').config();
const { db } = require('./backend/firestore');
const crypto = require('crypto');

async function fixPhonesAndHashes() {
  const usersRef = db.collection('users');
  const saltStr = 'chilimba_agent_salt_2026';
  
  // Fix Musole
  const musoleHash = crypto.createHash('sha256').update(saltStr + '47183').digest('hex');
  const musoleSnap = await usersRef.where('phone_number', '==', '+260768488494').get();
  musoleSnap.forEach(async doc => {
    await doc.ref.update({ passcode_hash: musoleHash });
    console.log('Fixed Musole Hash');
  });

  // Fix Freda
  const fredaHash = crypto.createHash('sha256').update(saltStr + '25258').digest('hex');
  const fredaSnap = await usersRef.where('phone_number', '==', '+255719594633').get();
  fredaSnap.forEach(async doc => {
    await doc.ref.update({ passcode_hash: fredaHash });
    console.log('Fixed Freda Hash');
  });

  setTimeout(() => process.exit(0), 2000);
}

fixPhonesAndHashes();
