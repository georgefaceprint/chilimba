// backend/firestore.js
// Modular Firebase Admin SDK (v14+)
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } catch (err) {
    console.error('❌ FIREBASE_SERVICE_ACCOUNT is not valid JSON:', err);
    process.exit(1);
  }
} else if (process.env.FIREBASE_SA_PATH) {
  const saPath = process.env.FIREBASE_SA_PATH;
  serviceAccount = JSON.parse(fs.readFileSync(path.resolve(saPath), 'utf8'));
} else {
  console.error('❌ FIREBASE_SA_PATH or FIREBASE_SERVICE_ACCOUNT not set');
  process.exit(1);
}

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

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
