const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function run() {
    try {
        console.log('--- Actualizando Administradores ---');

        // 1. Promover tic@jata.es y tic02@jata.es
        const emailsToPromote = ['tic@jata.es', 'tic02@jata.es'];

        for (const email of emailsToPromote) {
            const res = await pool.query(
                `UPDATE tickets.users SET role = 'admin' WHERE email = $1 RETURNING *`,
                [email]
            );
            if (res.rowCount > 0) {
                console.log(`✅ Usuario ${email} promovido a ADMIN.`);
            } else {
                console.log(`⚠️ Usuario ${email} no encontrado (¿Quizás no ha iniciado sesión aún?).`);
            }
        }

        // 2. Borrar admin@tickets.com
        console.log('\n--- Eliminando Usuario Admin Legacy ---');
        try {
            const deleteRes = await pool.query(
                `DELETE FROM tickets.users WHERE email = 'admin@tickets.com' RETURNING *`
            );
            if (deleteRes.rowCount > 0) {
                console.log(`✅ Usuario admin@tickets.com eliminado exitosamente.`);
            } else {
                console.log(`ℹ️ Usuario admin@tickets.com no encontrado.`);
            }
        } catch (err) {
            if (err.code === '23503') { // Foreign Key Violation
                console.error(`❌ No se pudo eliminar admin@tickets.com: Tiene tickets o comentarios asociados.`);
                console.log(`   Considere reasignar sus tickets antes de eliminarlo.`);
            } else {
                console.error('Error al eliminar admin:', err.message);
            }
        }

    } catch (err) {
        console.error('Error general:', err);
    } finally {
        pool.end();
    }
}

run();
