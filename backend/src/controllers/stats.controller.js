const db = require('../config/db');
const logger = require('../utils/logger');

// @desc    Obtener estadísticas del dashboard
// @route   GET /api/stats
// @access  Admin/Agent
exports.getDashboardStats = async (req, res) => {
    try {
        // 1. Contadores Globales
        const countsQuery = `
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN status = 'open' THEN 1 END) as open,
                COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
                COUNT(CASE WHEN status = 'waiting' THEN 1 END) as waiting,
                COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed
            FROM tickets.tickets
        `;
        const countsResult = await db.query(countsQuery);
        const counts = countsResult.rows[0];

        // 2. Tickets por Prioridad (para Gráfico de Pastel)
        const priorityQuery = `
            SELECT priority, COUNT(*) as count 
            FROM tickets.tickets 
            GROUP BY priority
        `;
        const priorityResult = await db.query(priorityQuery);

        // 3. Tickets por Estado (para Gráfico de Barras/Pastel)
        const statusQuery = `
            SELECT status, COUNT(*) as count 
            FROM tickets.tickets 
            GROUP BY status
        `;
        const statusResult = await db.query(statusQuery);

        // 4. Tendencia: Tickets creados últimos 7 días
        const trendQuery = `
            SELECT TO_CHAR(created_at, 'YYYY-MM-DD') as date, COUNT(*) as count
            FROM tickets.tickets
            WHERE created_at >= NOW() - INTERVAL '7 days'
            GROUP BY date
            ORDER BY date ASC
        `;
        const trendResult = await db.query(trendQuery);

        // 5. Top Usuarios (Más tickets creados)
        const topUsersQuery = `
            SELECT u.id, u.username, u.full_name, COUNT(t.id) as ticket_count
            FROM tickets.users u
            JOIN tickets.tickets t ON u.id = t.created_by
            GROUP BY u.id, u.username, u.full_name
            ORDER BY ticket_count DESC
            LIMIT 5
        `;
        const topUsersResult = await db.query(topUsersQuery);

        // 6. Tiempo Promedio de Resolución (en horas)
        // Calculamos solo para tickets cerrados que tengan closed_at
        const avgResolutionQuery = `
            SELECT AVG(EXTRACT(EPOCH FROM (closed_at - created_at))/3600) as avg_hours
            FROM tickets.tickets
            WHERE status = 'closed' AND closed_at IS NOT NULL
        `;
        const avgResolutionResult = await db.query(avgResolutionQuery);
        const avgResolutionHours = parseFloat(avgResolutionResult.rows[0].avg_hours || 0).toFixed(1);

        res.json({
            counts: {
                total: parseInt(counts.total),
                open: parseInt(counts.open),
                in_progress: parseInt(counts.in_progress),
                waiting: parseInt(counts.waiting),
                closed: parseInt(counts.closed)
            },
            byPriority: priorityResult.rows,
            byStatus: statusResult.rows,
            trend: trendResult.rows,
            topUsers: topUsersResult.rows,
            avgResolutionHours
        });

    } catch (err) {
        logger.error(`Error fetching stats: ${err.message}`);
        res.status(500).send('Error del servidor al obtener estadísticas');
    }
};
