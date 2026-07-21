const { poolPromise } = require('../src/config/db');

async function main() {
  try {
    const pool = await poolPromise;
    console.log('Connected to DB. Adding visibility column...');

    // Check if column exists before adding to avoid errors
    const checkRes = await pool.request().query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'tickets' AND TABLE_NAME = 'tickets' AND COLUMN_NAME = 'visibility'
    `);

    if (checkRes.recordset.length === 0) {
      await pool.request().query(`
        ALTER TABLE tickets.tickets
        ADD visibility VARCHAR(20) NOT NULL DEFAULT 'private';
      `);
      console.log('Column visibility added successfully.');
    } else {
      console.log('Column visibility already exists.');
    }

  } catch (err) {
    console.error('Error adding column:', err);
  } finally {
    process.exit(0);
  }
}

main();
