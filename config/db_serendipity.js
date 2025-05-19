const { Pool } = require('pg');
require('dotenv').config();

const serendipityPool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME_SERENDIPITY,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

serendipityPool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

serendipityPool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = serendipityPool;