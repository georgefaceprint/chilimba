require('dotenv').config({ path: '../.env' });
const { db } = require('../backend/firestore');
const fs = require('fs');
const path = require('path');

async function seedProducts() {
  console.log("Seeding Firestore with products.json...");
  const productsPath = path.join(__dirname, '../public/products.json');
  const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));

  let count = 0;
  for (const product of products) {
    // Generate a unique ID or let Firestore generate it
    // But since the frontend uses p.id, let's keep the existing ID if possible!
    const existingId = product.id;
    // ensure price_tzs is number
    const p = {
      title: product.title,
      description: product.description || '',
      price_zmw: product.price_zmw,
      category: product.category || 'Fashion',
      supplier_name: product.supplier_name || 'Alibonse',
      image_urls: product.image_urls || [product.image_url],
      created_at: new Date().toISOString()
    };
    
    // We can use the existing 'id' from JSON as the Firestore Document ID so existing local storage carts don't break immediately
    await db.collection('products').doc(existingId.toString()).set(p);
    count++;
  }
  
  console.log(`Successfully seeded ${count} products to Firestore!`);
  process.exit(0);
}

seedProducts().catch(err => {
  console.error("Error seeding products:", err);
  process.exit(1);
});
