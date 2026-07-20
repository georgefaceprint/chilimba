const { db } = require('./backend/firestore');
async function run() {
  const snapshot1 = await db.collection('products').get();
  console.log('Without orderBy:', snapshot1.size);
  
  try {
    const snapshot2 = await db.collection('products').orderBy('title').get();
    console.log('With orderBy(title):', snapshot2.size);
  } catch (e) {
    console.log('Error:', e.message);
  }
  
  try {
    const snapshot3 = await db.collection('products').orderBy('created_at').get();
    console.log('With orderBy(created_at):', snapshot3.size);
  } catch (e) {
    console.log('Error:', e.message);
  }
  
  process.exit(0);
}
run();
