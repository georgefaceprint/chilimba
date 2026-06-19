const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('✅ Connected to Supabase PostgreSQL database.');

    const schemaPath = path.join(__dirname, '../db/schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log('⏳ Running schema migration...');
    await client.query(schemaSql);
    
    console.log('🎉 Schema migration applied successfully. All tables created.');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    await client.end();
  }
}

runMigration();
