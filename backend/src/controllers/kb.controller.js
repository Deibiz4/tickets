const { poolPromise, sql } = require('../config/db');
const { NotFoundError, BadRequestError } = require('../middleware/errorHandler');
const fs = require('fs');

const kbController = {
    // Obtener artículos (con búsqueda opcional)
    async getArticles(req, res, next) {
        try {
            const { search, category_id } = req.query;
            const pool = await poolPromise;
            const request = pool.request();

            let queryText = `
        SELECT a.id, a.title, a.content, a.is_published, a.created_at,
               c.name as category_name,
               u.full_name as author_name
        FROM tickets.kb_articles a
        LEFT JOIN tickets.kb_categories c ON a.category_id = c.id
        LEFT JOIN tickets.users u ON a.author_id = u.id
        WHERE a.is_published = 1
      `; // 1 for true

            if (search) {
                queryText += ` AND (a.title LIKE @search OR a.content LIKE @search)`;
                request.input('search', sql.NVarChar, `%${search}%`);
            }

            if (category_id) {
                queryText += ` AND a.category_id = @category_id`;
                request.input('category_id', sql.Int, category_id);
            }

            queryText += ' ORDER BY a.created_at DESC';

            const result = await request.query(queryText);
            res.json(result.recordset);
        } catch (error) {
            next(error);
        }
    },

    // Obtener detalle de artículo
    async getArticle(req, res, next) {
        try {
            const { id } = req.params;
            const pool = await poolPromise;
            const result = await pool.request()
                .input('id', sql.Int, id)
                .query(`
          SELECT a.*, c.name as category_name, u.full_name as author_name 
          FROM tickets.kb_articles a
          LEFT JOIN tickets.kb_categories c ON a.category_id = c.id
          LEFT JOIN tickets.users u ON a.author_id = u.id
          WHERE a.id = @id
        `);

            if (result.recordset.length === 0) {
                throw new NotFoundError('Artículo no encontrado');
            }

            res.json(result.recordset[0]);
        } catch (error) {
            next(error);
        }
    },

    // Crear artículo (Admin/Agent)
    async createArticle(req, res, next) {
        try {
            const { title, content, category_id, is_published } = req.body;
            const author_id = req.user.id;

            if (!title || !content || !category_id) {
                throw new BadRequestError('Título, contenido y categoría son obligatorios');
            }

            const pool = await poolPromise;
            const result = await pool.request()
                .input('title', sql.NVarChar, title)
                .input('content', sql.NVarChar, content)
                .input('category_id', sql.Int, category_id)
                .input('author_id', sql.Int, author_id)
                .input('is_published', sql.Bit, is_published ?? true)
                .query(`
          INSERT INTO tickets.kb_articles (title, content, category_id, author_id, is_published)
          OUTPUT Inserted.id, Inserted.title, Inserted.created_at
          VALUES (@title, @content, @category_id, @author_id, @is_published)
        `);

            res.status(201).json(result.recordset[0]);
        } catch (error) {
            next(error);
        }
    },

    // Actualizar artículo (Admin/Agent)
    async updateArticle(req, res, next) {
        try {
            const { id } = req.params;
            const { title, content, category_id, is_published } = req.body;

            // Construir query dinámica
            const updates = [];
            const pool = await poolPromise;
            const request = pool.request();
            request.input('id', sql.Int, id);

            if (title) {
                updates.push('title = @title');
                request.input('title', sql.NVarChar, title);
            }
            if (content) {
                updates.push('content = @content');
                request.input('content', sql.NVarChar, content);
            }
            if (category_id) {
                updates.push('category_id = @category_id');
                request.input('category_id', sql.Int, category_id);
            }
            if (is_published !== undefined) {
                updates.push('is_published = @is_published');
                request.input('is_published', sql.Bit, is_published);
            }

            if (updates.length === 0) {
                return res.json({ message: 'No changes provided' });
            }

            const queryText = `
        UPDATE tickets.kb_articles 
        SET ${updates.join(', ')}, updated_at = SYSDATETIME() 
        OUTPUT Inserted.*
        WHERE id = @id`;

            const result = await request.query(queryText);

            if (result.recordset.length === 0) {
                throw new NotFoundError('Artículo no encontrado');
            }

            res.json(result.recordset[0]);
        } catch (error) {
            next(error);
        }
    },

    // Eliminar artículo (Admin/Agent)
    async deleteArticle(req, res, next) {
        try {
            const { id } = req.params;
            const pool = await poolPromise;
            const result = await pool.request()
                .input('id', sql.Int, id)
                .query('DELETE FROM tickets.kb_articles OUTPUT Deleted.id WHERE id = @id');

            if (result.recordset.length === 0) {
                throw new NotFoundError('Artículo no encontrado');
            }

            res.json({ message: 'Artículo eliminado correctamente' });
        } catch (error) {
            next(error);
        }
    },

    // Listar categorías
    async getCategories(req, res, next) {
        try {
            const pool = await poolPromise;
            const result = await pool.request()
                .query('SELECT * FROM tickets.kb_categories ORDER BY name ASC');
            res.json(result.recordset);
        } catch (error) {
            next(error);
        }
    },

    // Add Attachment
    async uploadAttachment(req, res, next) {
        try {
            if (!req.file) {
                return res.status(400).json({ msg: 'No se subió ningún archivo' });
            }

            const { id } = req.params;
            const { originalname, path: filePath, size, mimetype } = req.file;

            const pool = await poolPromise;
            const result = await pool.request()
                .input('id', sql.Int, id)
                .input('file_name', sql.VarChar, originalname)
                .input('file_path', sql.VarChar, filePath)
                .input('file_size', sql.Int, size)
                .input('mime_type', sql.VarChar, mimetype)
                .input('uploaded_by', sql.Int, req.user.id)
                .query(`
          INSERT INTO tickets.kb_attachments 
          (article_id, file_name, file_path, file_size, mime_type, uploaded_by) 
          OUTPUT Inserted.*
          VALUES (@id, @file_name, @file_path, @file_size, @mime_type, @uploaded_by) 
        `);

            res.json(result.recordset[0]);
        } catch (error) {
            next(error);
        }
    },

    // Delete Attachment
    async deleteAttachment(req, res, next) {
        try {
            const { id, attachmentId } = req.params;
            const pool = await poolPromise;

            // Get file path first
            const attachRes = await pool.request()
                .input('attachmentId', sql.Int, attachmentId)
                .input('articleId', sql.Int, id)
                .query('SELECT * FROM tickets.kb_attachments WHERE id = @attachmentId AND article_id = @articleId');

            if (attachRes.recordset.length === 0) {
                return res.status(404).json({ msg: 'Adjunto no encontrado' });
            }

            const attachment = attachRes.recordset[0];

            // Delete from DB
            await pool.request()
                .input('attachmentId', sql.Int, attachmentId)
                .query('DELETE FROM tickets.kb_attachments WHERE id = @attachmentId');

            // Delete file from disk (optional, handled asynchronously to avoid blocking)
            if (fs.existsSync(attachment.file_path)) {
                fs.unlink(attachment.file_path, (err) => {
                    if (err) console.error('Error deleting file:', err);
                });
            }

            res.json({ msg: 'Adjunto eliminado' });
        } catch (error) {
            next(error);
        }
    },

    // Get Attachments
    async getAttachments(req, res, next) {
        try {
            const { id } = req.params;
            const pool = await poolPromise;
            const result = await pool.request()
                .input('id', sql.Int, id)
                .query('SELECT * FROM tickets.kb_attachments WHERE article_id = @id ORDER BY created_at DESC');
            res.json(result.recordset);
        } catch (error) {
            next(error);
        }
    }
};

module.exports = kbController;
