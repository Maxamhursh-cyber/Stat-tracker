const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set. See .env.example.');
}

const useSSL = process.env.DATABASE_SSL !== 'false';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSSL ? { rejectUnauthorized: false } : false,
});

async function initSchema() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(schema);
}

module.exports = { pool, initSchema };
