// backend/firestore.js
// Modular Firebase Admin SDK (v14+)
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

let serviceAccount;
let db;

try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } else if (process.env.FIREBASE_SA_PATH) {
    const saPath = process.env.FIREBASE_SA_PATH;
    if (fs.existsSync(path.resolve(saPath))) {
      serviceAccount = JSON.parse(fs.readFileSync(path.resolve(saPath), 'utf8'));
    } else {
      console.warn(`⚠️ FIREBASE_SA_PATH file not found: ${saPath}`);
    }
  } else {
    console.warn('⚠️ No FIREBASE_SERVICE_ACCOUNT or FIREBASE_SA_PATH found.');
  }

  initializeApp(serviceAccount ? { credential: cert(serviceAccount) } : undefined);
  db = getFirestore();
} catch (err) {
  console.error('❌ Firebase Initialization Error:', err.message);
  // Create a mock db object that throws a descriptive error if used
  db = {
    collection: () => ({
      where: () => { throw new Error('Firebase Database not initialized: ' + err.message); },
      doc: () => { throw new Error('Firebase Database not initialized: ' + err.message); },
      add: () => { throw new Error('Firebase Database not initialized: ' + err.message); },
      orderBy: () => ({ get: () => { throw new Error('Firebase Database not initialized: ' + err.message); } })
    })
  };
}

/**
 * Simple query helper mimicking the old pg pool interface.
 * collectionName: Firestore collection name (e.g., 'products')
 * orderField: field to order by (defaults to 'title')
 * Returns an array of plain objects.
 */
async function query(collectionName, orderField = 'title') {
  const snapshot = await db.collection(collectionName).orderBy(orderField).get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

module.exports = { query, db };
