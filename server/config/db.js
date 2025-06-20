const { Pool } = require('pg');
require('dotenv').config();

// Debug environment variables
console.log('Database Configuration:');
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);

// Use environment variables if available, otherwise fall back to hardcoded connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://jjlim:npg_vkfzlprwGJ18@ep-fragrant-wind-a1u7i59x-pooler.ap-southeast-1.aws.neon.tech/sustenance_db?sslmode=require',
  // Alternative individual connection parameters (will be overridden by connectionString if present)
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: {
    rejectUnauthorized: false // Required for most cloud PostgreSQL providers
  }
});

// Test the connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Error connecting to the database:', err);
  } else {
    console.log('Successfully connected to the database');
    console.log('Connection time:', res.rows[0].now);
  }
});

module.exports = pool;