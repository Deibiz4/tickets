const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5434,
  database: process.env.DB_NAME || 'ticketsdb',
  user: process.env.DB_USER || 'user',
  password: process.env.DB_PASSWORD || 'password',
});

// Verificar la conexión a la base de datos
const connectDB = async () => {
  try {
    const client = await pool.connect();
    console.log('PostgreSQL connected...');
    client.release();
  } catch (err) {
    console.error('Error connecting to PostgreSQL:', err);
    process.exit(1);
  }
};

module.exports = {
  query: (text, params) => pool.query(text, params),
  connectDB,
  pool,
};
