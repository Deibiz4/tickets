const { poolPromise, sql } = require('../config/db');

class Comment {
    static async create({ ticketId, userId, content }) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('ticketId', sql.Int, ticketId)
            .input('userId', sql.Int, userId)
            .input('content', sql.NVarChar, content) // NVarChar for text
            .query(`
        INSERT INTO tickets.comments (ticket_id, user_id, content) 
        OUTPUT Inserted.*
        VALUES (@ticketId, @userId, @content)
      `);
        return result.recordset[0];
    }

    static async findByTicketId(ticketId) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('ticketId', sql.Int, ticketId)
            .query(`
        SELECT c.*, u.username, u.full_name, u.role
        FROM tickets.comments c
        JOIN tickets.users u ON c.user_id = u.id
        WHERE c.ticket_id = @ticketId
        ORDER BY c.created_at ASC
      `);
        return result.recordset;
    }
}

module.exports = Comment;
