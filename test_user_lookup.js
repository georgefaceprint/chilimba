require('dotenv').config();
const { db } = require('./backend/firestore');
async function check() {
  const usersRef = db.collection('users');
  const snap = await usersRef.where('phone_number', '==', '+260970370302').get();
  if (snap.empty) {
    console.log("User not found exactly as +260970370302. Checking all users to see if a similar number exists...");
    const allUsers = await usersRef.get();
    let found = false;
    allUsers.forEach(doc => {
      const data = doc.data();
      if (data.phone_number && data.phone_number.includes('970370302')) {
        console.log("Found similar user:", doc.id, "=>", data.phone_number);
        found = true;
      }
    });
    if (!found) console.log("No similar user found.");
  } else {
    snap.forEach(doc => {
      console.log(doc.id, "=> phone:", doc.data().phone_number, "hash:", doc.data().passcode_hash);
      const crypto = require('crypto');
      const inputHash = crypto.createHash('sha256').update('chilimba_agent_salt_2026' + '47183').digest('hex');
      console.log('Does 47183 match?', inputHash === doc.data().passcode_hash);
    });
  }
}
check();
