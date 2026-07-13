require('dotenv').config();


async function checkDuplicates() {
  const usersRef = db.collection('users');
  const snapshot = await usersRef.where('email', '==', 'fridaandrew668@gmail.com').get();
  console.log(`Found ${snapshot.size} users with this email`);
  snapshot.forEach(doc => {
    console.log(doc.id, '=>', doc.data().role, doc.data().account_status);
  });
  process.exit(0);
}
checkDuplicates();
