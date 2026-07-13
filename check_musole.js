require('dotenv').config();
const { db } = require('./backend/firestore');

async function checkMusole() {
  const usersRef = db.collection('users');
  const snapshot = await usersRef.where('whatsapp', '==', '+260768488494').get();
  
  if (snapshot.empty) {
    console.log('NO USER FOUND FOR +260768488494');
  } else {
    snapshot.forEach(doc => {
      console.log('USER FOUND:', doc.id, doc.data());
    });
  }

  // Also try searching for phone_number just in case
  const snap2 = await usersRef.where('phone_number', '==', '+260768488494').get();
  if (!snap2.empty) {
    snap2.forEach(doc => {
      console.log('USER FOUND IN phone_number:', doc.id, doc.data());
    });
  }

  process.exit(0);
}

checkMusole();
