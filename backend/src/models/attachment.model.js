const { query } = require('../config/db');

class Attachment {
    static async create({ ticketId, commentId, fileName, filePath, fileSize, mimeType, uploadedBy }) {
        const result = await query(
            `INSERT INTO tickets.attachments 
       (ticket_id, comment_id, file_name, file_path, file_size, mime_type, uploaded_by) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
            [ticketId, commentId, fileName, filePath, fileSize, mimeType, uploadedBy]
        );
        return result.rows[0];
    }

    static async findByTicketId(ticketId) {
        const result = await query(
            `SELECT a.*, u.username
       FROM tickets.attachments a
       JOIN tickets.users u ON a.uploaded_by = u.id
       WHERE a.ticket_id = $1
       ORDER BY a.created_at DESC`,
            [ticketId]
        );
        return result.rows;
    }
}

module.exports = Attachment;
