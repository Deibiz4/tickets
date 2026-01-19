const { query } = require('../config/db');
const { NotFoundError, BadRequestError } = require('../middleware/errorHandler');

const kbController = {
    // Obtener artículos (con búsqueda opcional)
    async getArticles(req, res, next) {
        try {
            const { search, category_id } = req.query;
            const values = [];
            let queryText = `
        SELECT a.id, a.title, a.content, a.is_published, a.created_at,
               c.name as category_name,
               u.full_name as author_name
        FROM tickets.kb_articles a
        LEFT JOIN tickets.kb_categories c ON a.category_id = c.id
        LEFT JOIN tickets.users u ON a.author_id = u.id
        WHERE a.is_published = true
      `;

            let paramIndex = 1;

            if (search) {
                queryText += ` AND (a.title ILIKE $${paramIndex} OR a.content ILIKE $${paramIndex})`;
                values.push(`%${search}%`);
                paramIndex++;
            }

            if (category_id) {
                queryText += ` AND a.category_id = $${paramIndex}`;
                values.push(category_id);
                paramIndex++;
            }

            queryText += ' ORDER BY a.created_at DESC';

            const result = await query(queryText, values);
            res.json(result.rows);
        } catch (error) {
            next(error);
        }
    },

    // Obtener detalle de artículo
    async getArticle(req, res, next) {
        try {
            const { id } = req.params;
            const result = await query(
                `SELECT a.*, c.name as category_name, u.full_name as author_name 
         FROM tickets.kb_articles a
         LEFT JOIN tickets.kb_categories c ON a.category_id = c.id
         LEFT JOIN tickets.users u ON a.author_id = u.id
         WHERE a.id = $1`,
                [id]
            );

            if (result.rows.length === 0) {
                throw new NotFoundError('Artículo no encontrado');
            }

            res.json(result.rows[0]);
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

            const result = await query(
                `INSERT INTO tickets.kb_articles (title, content, category_id, author_id, is_published)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, title, created_at`,
                [title, content, category_id, author_id, is_published ?? true]
            );

            res.status(201).json(result.rows[0]);
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
            const values = [];
            let paramIndex = 1;

            if (title) { updates.push(`title = $${paramIndex++}`); values.push(title); }
            if (content) { updates.push(`content = $${paramIndex++}`); values.push(content); }
            if (category_id) { updates.push(`category_id = $${paramIndex++}`); values.push(category_id); }
            if (is_published !== undefined) { updates.push(`is_published = $${paramIndex++}`); values.push(is_published); }

            if (updates.length === 0) {
                return res.json({ message: 'No changes provided' });
            }

            updates.push(`updated_at = NOW()`);

            const queryText = `
        UPDATE tickets.kb_articles 
        SET ${updates.join(', ')} 
        WHERE id = $${paramIndex} 
        RETURNING *`;

            values.push(id);

            const result = await query(queryText, values);

            if (result.rows.length === 0) {
                throw new NotFoundError('Artículo no encontrado');
            }

            res.json(result.rows[0]);
        } catch (error) {
            next(error);
        }
    },

    // Eliminar artículo (Admin/Agent)
    async deleteArticle(req, res, next) {
        try {
            const { id } = req.params;
            const result = await query('DELETE FROM tickets.kb_articles WHERE id = $1 RETURNING id', [id]);

            if (result.rows.length === 0) {
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
            const result = await query('SELECT * FROM tickets.kb_categories ORDER BY name ASC');
            res.json(result.rows);
        } catch (error) {
            next(error);
        }
    }
};

module.exports = kbController;
