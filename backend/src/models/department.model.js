const { poolPromise, sql } = require('../config/db');

class Department {
    static async findAll() {
        const pool = await poolPromise;
        const result = await pool.request()
            .query('SELECT id, name FROM tickets.departments ORDER BY name ASC');
        return result.recordset;
    }

    static async findById(id) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT id, name FROM tickets.departments WHERE id = @id');
        return result.recordset[0] || null;
    }

    static async findByName(name) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('name', sql.VarChar, name)
            .query('SELECT id, name FROM tickets.departments WHERE name = @name');
        return result.recordset[0] || null;
    }
}

module.exports = Department;
