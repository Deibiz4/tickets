const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

async function run() {
    console.log('Connecting to DB:', {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        db: process.env.DB_NAME,
        user: process.env.DB_USER
    });
    try {
        const res = await pool.query("SELECT * FROM tickets.users WHERE email = 'admin@tickets.com'");
        if (res.rows.length === 0) {
            console.log('User NOT found in DB');
            return;
        }
        const user = res.rows[0];
        console.log('User found:', user.username, user.email);
        console.log('Hash from DB:', user.password_hash);

        const match = await bcrypt.compare('admin123', user.password_hash);
        console.log('Bcrypt compare result for "admin123":', match);

        // Test generating a fresh hash to see if it matches
        const freshHash = await bcrypt.hash('admin123', 10);
        console.log('Fresh hash for "admin123":', freshHash);
        const freshMatch = await bcrypt.compare('admin123', freshHash);
        console.log('Fresh hash verification:', freshMatch);

    } catch (e) {
        console.error('Error:', e);
    } finally {
        pool.end();
    }
}

run();
