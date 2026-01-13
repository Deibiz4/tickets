const { query } = require('../config/db');

class Ticket {
  static async create({ title, description, priority, status = 'open', createdBy }) {
    console.log('TicketModel: Create start', { title, createdBy });
    try {
      const result = await query(
        `INSERT INTO tickets.tickets 
         (title, description, priority, status, created_by) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING *`,
        [title, description, priority, status, createdBy]
      );
      console.log('TicketModel: Create success', result.rows[0]);
      return result.rows[0];
    } catch (e) {
      console.error('TicketModel: Create error', e);
      throw e;
    }
  }

  static async find(userId = null) {
    console.log('TicketModel: Find start', userId ? `Filtering by user ${userId}` : 'All tickets');
    try {
      let queryText = `SELECT t.*, 
                u.username as creator_username, 
                u.full_name as creator_full_name,
                u.department as creator_department
         FROM tickets.tickets t
         JOIN tickets.users u ON t.created_by = u.id`;

      const values = [];

      if (userId) {
        queryText += ` WHERE t.created_by = $1`;
        values.push(userId);
      }

      queryText += ` ORDER BY t.created_at DESC`;

      const result = await query(queryText, values);
      console.log('TicketModel: Find success', result.rows.length);
      return result.rows;
    } catch (e) {
      console.error('TicketModel: Find error', e);
      throw e;
    }
  }

  static async findById(id) {
    const result = await query(
      `SELECT t.*, 
              u.username as creator_username, 
              u.full_name as creator_full_name,
              u.department as creator_department,
              au.username as assigned_username,
              au.full_name as assigned_full_name
       FROM tickets.tickets t
       LEFT JOIN tickets.users u ON t.created_by = u.id
       LEFT JOIN tickets.users au ON t.assigned_to = au.id
       WHERE t.id = $1`,
      [id]
    );
    return result.rows[0];
  }

  static async update(id, updates) {
    const allowedColumns = ['priority', 'status', 'assigned_to'];
    const keys = Object.keys(updates).filter(key => allowedColumns.includes(key));

    if (keys.length === 0) return null;

    const setClause = keys.map((key, index) => `${key} = $${index + 2}`).join(', ');
    const values = [id, ...keys.map(key => updates[key])];

    const result = await query(
      `UPDATE tickets.tickets 
       SET ${setClause}, updated_at = NOW() 
       WHERE id = $1 
       RETURNING *`,
      values
    );
    return result.rows[0];
  }

  static async delete(id) {
    const result = await query(
      'DELETE FROM tickets.tickets WHERE id = $1 RETURNING id',
      [id]
    );
    return result.rows[0];
  }
}

module.exports = Ticket;
