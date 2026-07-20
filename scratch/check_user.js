require('dotenv').config();
const { db } = require('./backend/firestore');
async function check() {
  const usersRef = db.collection('users');
  const snap = await usersRef.where('phone_number', '==', '+260970370302').get();
  if (snap.empty) {
    console.log("User not found!");
  } else {
    snap.forEach(doc => {
      console.log(doc.id, "=>", doc.data());
    });
  }
}
check();
