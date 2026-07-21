const { poolPromise, sql } = require('./config/db');

async function check() {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'tickets' AND TABLE_NAME = 'tickets'");
        console.log(result.recordset.map(r => r.COLUMN_NAME));
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}
check();
