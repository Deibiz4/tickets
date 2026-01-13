const { query } = require('../config/db');

class Department {
    static async findAll() {
        const result = await query(
            'SELECT id, name FROM tickets.departments ORDER BY name ASC'
        );
        return result.rows;
    }
}

module.exports = Department;
