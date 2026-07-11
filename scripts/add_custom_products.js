require('dotenv').config({ path: './.env' });
const { db } = require('../backend/firestore');

const productsToAdd = [
  {
    id: 'nakonde_rice',
    title: 'Nakonde Rice (10kg Pack)',
    description: 'Premium quality long-grain white rice sourced directly from Nakonde. Clean, polished, and delicious. Minimum purchase of 1 pack (10kg).',
    price_zmw: 220,
    weight_kg: 10,
    category: 'Agriculture',
    sub_category: 'Grains',
    origin_country: 'Zambia',
    origin_city: 'Nakonde',
    image_urls: ['/assets/img/nakonde_rice.png'],
    supplier_name: 'Nakonde Rice Co.',
    supplier_id: 'nakonde_supplier',
    is_local_stock: true,
    trust_rating: 4.9,
    created_at: new Date().toISOString(),
    price_tiers: [
      { min_qty: 1, price_zmw: 220 }
    ],
    custom_logistics: {
      base_fee: 50,
      tiers: [
        { min_qty: 10, fee_per_unit: 40 }
      ]
    }
  },
  {
    id: 'tanzania_potatoes',
    title: 'Tanzania Potatoes (25kg Bucket)',
    description: 'Fresh, organic round potatoes harvested from Tanzanian highlands. Packaged in a durable 25kg bucket (approx 20 Liters). Excellent for domestic and commercial kitchen use.',
    price_zmw: 150,
    weight_kg: 25,
    category: 'Agriculture',
    sub_category: 'Vegetables',
    origin_country: 'Tanzania',
    origin_city: 'Mbeya',
    image_urls: ['/assets/img/potatoes_bucket.png'],
    supplier_name: 'Tanzanian Farms Ltd',
    supplier_id: 'tanzania_supplier',
    is_local_stock: false,
    trust_rating: 4.8,
    created_at: new Date().toISOString(),
    price_tiers: [
      { min_qty: 1, price_zmw: 150 },
      { min_qty: 5, price_zmw: 130 }
    ],
    custom_logistics: {
      base_fee: 50,
      tiers: [
        { min_qty: 5, fee_per_unit: 40 }
      ]
    }
  }
];

async function addProducts() {
  console.log('Seeding custom products to Firestore...');
  try {
    for (const prod of productsToAdd) {
      const { id, ...data } = prod;
      await db.collection('products').doc(id).set(data);
      console.log(`✅ Product "${prod.title}" added/updated successfully with ID "${id}"`);
    }
    console.log('🎉 Seeding completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

addProducts();
