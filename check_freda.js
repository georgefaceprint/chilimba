require('dotenv').config();
const { db } = require('./backend/firestore');

async function checkFreda() {
  const usersRef = db.collection('users');
  const snapshot = await usersRef.where('phone_number', '==', '+255719594633').get();
  
  if (snapshot.empty) {
    console.log('No user found with +255719594633 as phone_number.');
  } else {
    snapshot.docs.forEach(doc => {
      console.log('User found! ID:', doc.id);
      console.log(doc.data());
    });
  }

  const emailSnap = await usersRef.where('email', '==', 'fridaandrew668@gmail.com').get();
  if (emailSnap.empty) {
    console.log('No user found with fridaandrew668@gmail.com.');
  } else {
    emailSnap.docs.forEach(doc => {
      console.log('Email User found! ID:', doc.id);
      console.log(doc.data());
    });
  }

  setTimeout(() => process.exit(0), 1000);
}

checkFreda();
