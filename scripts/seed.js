const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runSeed() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('✅ Connected to Supabase PostgreSQL database.');

    const seedPath = path.join(__dirname, '../db/seeds.json');
    const seeds = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

    console.log(`⏳ Seeding ${seeds.length} products into the catalog...`);
    
    for (const item of seeds) {
      await client.query(`
        INSERT INTO Products (product_id, supplier_name, origin_country, title, description, price_zmw, weight_kg, image_urls)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (product_id) DO NOTHING;
      `, [
        item.product_id,
        item.supplier_name,
        item.origin_country,
        item.title,
        item.description,
        item.price_zmw,
        item.weight_kg,
        item.image_urls
      ]);
    }
    
    console.log('🎉 Seed data successfully applied.');
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
  } finally {
    await client.end();
  }
}

runSeed();
