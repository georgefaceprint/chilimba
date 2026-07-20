require('dotenv').config();
const { db } = require('./backend/firestore');
const crypto = require('crypto');

async function fixPasscode() {
  const usersRef = db.collection('users');
  const snap = await usersRef.where('phone_number', '==', '+260970370302').get();
  
  if (snap.empty) {
    console.log("User not found!");
    return;
  }
  
  const saltStr = 'chilimba_agent_salt_2026';
  const passcode = '47183';
  const passcodeHash = crypto.createHash('sha256').update(saltStr + passcode).digest('hex');
  
  const batch = db.batch();
  snap.forEach(doc => {
    console.log(`Updating passcode for user: ${doc.id}`);
    batch.update(usersRef.doc(doc.id), { passcode_hash: passcodeHash });
  });
  
  await batch.commit();
  console.log("Passcode successfully updated to 47183 for all matching users.");
}

fixPasscode();
