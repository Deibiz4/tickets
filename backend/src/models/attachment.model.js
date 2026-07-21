const { poolPromise, sql } = require('../config/db');

class Attachment {
    static async create({ ticketId, commentId, fileName, filePath, fileSize, mimeType, uploadedBy }) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('ticketId', sql.Int, ticketId)
            .input('commentId', sql.Int, commentId)
            .input('fileName', sql.VarChar, fileName)
            .input('filePath', sql.VarChar, filePath)
            .input('fileSize', sql.Int, fileSize)
            .input('mimeType', sql.VarChar, mimeType)
            .input('uploadedBy', sql.Int, uploadedBy)
            .query(`
        INSERT INTO tickets.attachments 
        (ticket_id, comment_id, file_name, file_path, file_size, mime_type, uploaded_by) 
        OUTPUT Inserted.*
        VALUES (@ticketId, @commentId, @fileName, @filePath, @fileSize, @mimeType, @uploadedBy)
      `);
        return result.recordset[0];
    }

    static async findByTicketId(ticketId) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('ticketId', sql.Int, ticketId)
            .query(`
        SELECT a.*, u.username
        FROM tickets.attachments a
        JOIN tickets.users u ON a.uploaded_by = u.id
        WHERE a.ticket_id = @ticketId
        ORDER BY a.created_at DESC
      `);
        return result.recordset;
    }
}

module.exports = Attachment;
