const { poolPromise, sql } = require('../config/db');
const Comment = require('../models/comment.model');
const logger = require('../utils/logger');

/**
 * Evalúa y genera automáticamente un artículo de la base de conocimiento para un ticket cerrado.
 * @param {number} ticketId - ID del ticket cerrado
 * @param {number} authorId - ID del usuario que cerró el ticket (agente/admin)
 */
async function generateKBArticleForTicket(ticketId, authorId) {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            logger.info(`[KB Auto-Generator] Funcionalidad desactivada: GEMINI_API_KEY no configurada en el archivo .env.`);
            return;
        }

        logger.info(`[KB Auto-Generator] Iniciando evaluación de documentación para el ticket ID: ${ticketId}`);

        // 1. Obtener detalles completos del ticket
        const pool = await poolPromise;
        const ticketResult = await pool.request()
            .input('id', sql.Int, ticketId)
            .query(`
                SELECT t.*, d.name as department_name, u.username as creator_username
                FROM tickets.tickets t
                LEFT JOIN tickets.departments d ON t.department_id = d.id
                LEFT JOIN tickets.users u ON t.created_by = u.id
                WHERE t.id = @id
            `);

        const ticket = ticketResult.recordset[0];
        if (!ticket) {
            logger.error(`[KB Auto-Generator] Ticket ID ${ticketId} no encontrado en la base de datos.`);
            return;
        }

        // 2. Obtener comentarios del ticket para tener contexto de la conversación
        const comments = await Comment.findByTicketId(ticketId);
        const commentsText = comments.length > 0
            ? comments.map(c => `[${c.created_at ? new Date(c.created_at).toISOString() : 'N/A'}] ${c.full_name} (${c.role}): ${c.content}`).join('\n')
            : 'No hay comentarios adicionales.';

        // 3. Preparar prompt
        const promptText = `
Eres un asistente experto en soporte técnico de TI. Tu tarea es analizar el siguiente ticket que acaba de ser resuelto y cerrado:

INFORMACIÓN DEL TICKET:
- ID del Ticket: ${ticket.id}
- Título: ${ticket.title}
- Departamento: ${ticket.department_name || 'N/A'}
- Prioridad: ${ticket.priority}
- Descripción original del problema:
${ticket.description}

RESOLUCIÓN DEL TICKET:
- Resumen de la resolución: ${ticket.resolution_summary || 'N/A'}
- Acciones tomadas: ${ticket.resolution_actions || 'N/A'}

HISTORIAL DE COMENTARIOS / CONVERSACIÓN:
${commentsText}

INSTRUCCIONES:
1. Evalúa si este ticket representa un problema complejo, inusual o difícil de resolver que amerite ser documentado en la Base de Conocimiento para consultas futuras.
   - NO documentes problemas rutinarios, simples o comunes (ej. reiniciar contraseña, instalar un programa estándar, encender el monitor, cables desconectados).
   - SÍ documentes problemas complejos (ej. configuraciones de red específicas, errores de software corporativo no documentados previamente, fallos de infraestructura, integraciones complejas).

2. Si determinas que NO es complejo ni inusual, establece "shouldDocument" en false.
3. Si determinas que SÍ debe documentarse, establece "shouldDocument" en true y genera:
   - "title": Un título descriptivo y claro orientado a la búsqueda (en español).
   - "content": Un artículo detallado y profesional en español utilizando formato Markdown. Debe tener las siguientes secciones obligatorias:
     # Descripción del Problema
     # Causa Raíz / Contexto
     # Pasos para la Solución (lista numerada con los pasos exactos)
     # Consejos y Prevención (consejos para evitar el problema o actuar proactivamente)
   - "categoryId": La categoría recomendada de entre las siguientes opciones:
     - 1 para General (Temas generales o transversales)
     - 2 para Sistemas (Problemas de hardware, red, sistemas operativos, servidores, impresoras)
     - 3 para Software (Problemas con aplicaciones corporativas, programas de oficina, ERP, etc.)
`;

        const payload = {
            contents: [
                {
                    parts: [
                        {
                            text: promptText
                        }
                    ]
                }
            ],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "OBJECT",
                    properties: {
                        shouldDocument: {
                            type: "BOOLEAN",
                            description: "True si el ticket debe documentarse en la KB por su complejidad o rareza, False de lo contrario."
                        },
                        title: {
                            type: "STRING",
                            description: "Título en español claro y descriptivo del artículo."
                        },
                        content: {
                            type: "STRING",
                            description: "Contenido del artículo estructurado con títulos en formato Markdown en español."
                        },
                        categoryId: {
                            type: "INTEGER",
                            description: "ID de la categoría recomendada: 1 para General, 2 para Sistemas, 3 para Software."
                        }
                    },
                    required: ["shouldDocument"]
                }
            }
        };

        // 4. Llamar a la API de Gemini usando fetch nativo
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Error en API Gemini (código ${response.status}): ${errText}`);
        }

        const resData = await response.json();
        const responseText = resData.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!responseText) {
            throw new Error('Respuesta vacía recibida de la API de Gemini');
        }

        const result = JSON.parse(responseText);

        if (result.shouldDocument) {
            if (!result.title || !result.content || !result.categoryId) {
                logger.warn(`[KB Auto-Generator] Gemini recomendó documentar pero la respuesta no incluyó título, contenido o categoría. Saltando creación.`);
                return;
            }

            // Validar que la categoría sea válida
            const validCategories = [1, 2, 3];
            const finalCategoryId = validCategories.includes(result.categoryId) ? result.categoryId : 1;

            // 5. Insertar el artículo en la base de datos
            const insertResult = await pool.request()
                .input('title', sql.NVarChar, result.title)
                .input('content', sql.NVarChar, result.content)
                .input('category_id', sql.Int, finalCategoryId)
                .input('author_id', sql.Int, authorId)
                .input('is_published', sql.Bit, true) // Se publica directamente
                .query(`
                    INSERT INTO tickets.kb_articles (title, content, category_id, author_id, is_published)
                    OUTPUT Inserted.id, Inserted.title
                    VALUES (@title, @content, @category_id, @author_id, @is_published)
                `);

            const createdArticle = insertResult.recordset[0];
            logger.info(`[KB Auto-Generator] Artículo creado exitosamente: "${createdArticle.title}" (ID: ${createdArticle.id}) desde el ticket ID: ${ticketId}`);
        } else {
            logger.info(`[KB Auto-Generator] El ticket ID ${ticketId} fue evaluado pero clasificado como un problema común/sencillo. No se generó documentación.`);
        }

    } catch (err) {
        logger.error(`[KB Auto-Generator] Error en el proceso de generación automática: ${err.message}. Stack: ${err.stack}`);
    }
}

module.exports = {
    generateKBArticleForTicket
};
