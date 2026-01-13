const { query } = require('../config/db');

class Comment {
    static async create({ ticketId, userId, content }) {
        const result = await query(
            `INSERT INTO tickets.comments (ticket_id, user_id, content) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
            [ticketId, userId, content]
        );
        return result.rows[0];
    }

    static async findByTicketId(ticketId) {
        const result = await query(
            `SELECT c.*, u.username, u.full_name, u.role
       FROM tickets.comments c
       JOIN tickets.users u ON c.user_id = u.id
       WHERE c.ticket_id = $1
       ORDER BY c.created_at ASC`,
            [ticketId]
        );
        return result.rows;
    }
}

module.exports = Comment;
