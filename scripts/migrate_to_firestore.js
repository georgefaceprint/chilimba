// scripts/migrate_to_firestore.js
// Simple script to add sample product documents directly to Firestore (supports multiple databases).
// Run with: node scripts/migrate_to_firestore.js

require('dotenv').config();
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');
const fs = require('fs');

// Initialise Firestore using the service‑account JSON defined in .env
const saPath = process.env.FIREBASE_SA_PATH;
if (!saPath) {
  console.error('❌ FIREBASE_SA_PATH not set in .env');
  process.exit(1);
}
const serviceAccount = JSON.parse(fs.readFileSync(path.resolve(saPath), 'utf8'));

// Optional custom database ID (useful when you have multiple Firestore databases in the same project)
const dbId = process.env.FIRESTORE_DB_ID || '(default)';

initializeApp({
  credential: cert(serviceAccount),
  // If a custom DB ID is provided, include it; otherwise the SDK uses the default database.
  ...(dbId !== '(default)' ? { databaseId: dbId } : {}),
});

const firestore = getFirestore();

// Sample product data to seed Firestore
const sampleProducts = [
  { product_id: '201', supplier_name: 'Mwanzo Ltd', origin_country: 'Tanzania', title: 'Tanzanian Coffee', description: 'Premium Arabica beans', price_zmw: 150, image_urls: ['https://images.unsplash.com/photo-1559525839-b184a4d698c7?w=500&q=80'], weight_kg: 0.75 },
  { product_id: '202', supplier_name: 'Kikuyu Farms', origin_country: 'Tanzania', title: 'Tanzanian Tea', description: 'Organic black tea leaves', price_zmw: 100, image_urls: ['https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=500&q=80'], weight_kg: 0.5 },
  { product_id: '203', supplier_name: 'Sahara Spices', origin_country: 'Tanzania', title: 'Masala Mix', description: 'Traditional Tanzanian spice blend', price_zmw: 80, image_urls: ['https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=500&q=80'], weight_kg: 0.3 },
  { product_id: '204', supplier_name: 'Lakeview Honey', origin_country: 'Tanzania', title: 'Lake Tanganyika Honey', description: 'Pure wild honey from lake region', price_zmw: 220, image_urls: ['https://images.unsplash.com/photo-1587049352847-81a56d773c1c?w=500&q=80'], weight_kg: 1.0 },
  { product_id: '205', supplier_name: 'Savanna Crafts', origin_country: 'Tanzania', title: 'Handmade Basket', description: 'Woven basket from local artisans', price_zmw: 90, image_urls: ['https://images.unsplash.com/photo-1601614768370-df85731b816d?w=500&q=80'], weight_kg: 0.8 },
  { product_id: '206', supplier_name: 'Mambo Textiles', origin_country: 'Tanzania', title: 'Kitenge Fabric', description: 'Colorful traditional fabric', price_zmw: 130, image_urls: ['https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?w=500&q=80'], weight_kg: 0.4 },
  { product_id: '207', supplier_name: 'Coastal Fishery', origin_country: 'Tanzania', title: 'Tanzanian Tilapia', description: 'Fresh tilapia from the Indian Ocean', price_zmw: 180, image_urls: ['https://images.unsplash.com/photo-1534948216015-843149f72be3?w=500&q=80'], weight_kg: 1.2 },
  { product_id: '208', supplier_name: 'Mt. Kilimanjaro Coffee', origin_country: 'Tanzania', title: 'Mountain Roast', description: 'High altitude roasted coffee beans', price_zmw: 200, image_urls: ['https://images.unsplash.com/photo-1524350876685-274059332603?w=500&q=80'], weight_kg: 0.6 },
  { product_id: '209', supplier_name: 'Zanzibar Spices', origin_country: 'Tanzania', title: 'Clove Oil', description: 'Pure clove essential oil', price_zmw: 250, image_urls: ['https://images.unsplash.com/photo-1608500218890-c4f927e7f6e8?w=500&q=80'], weight_kg: 0.2 },
  { product_id: '210', supplier_name: 'Tanga Crafts', origin_country: 'Tanzania', title: 'Wooden Sculpture', description: 'Hand-carved wooden figurine', price_zmw: 300, image_urls: ['https://images.unsplash.com/photo-1544413660-299165566b1d?w=500&q=80'], weight_kg: 1.5 },
];

async function seed() {
  try {
    const batch = firestore.batch();
    const collection = firestore.collection('products');

    sampleProducts.forEach((prod) => {
      const docRef = collection.doc(prod.product_id.toString());
      // Remove product_id from stored fields (it’s used as the doc ID)
      const { product_id, ...data } = prod;
      batch.set(docRef, data);
    });

    await batch.commit();
    console.log('✅ Sample products written to Firestore');
  } catch (err) {
    console.error('❌ Seeding error:', err);
  }
}

seed();
