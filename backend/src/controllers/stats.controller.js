const { poolPromise, sql } = require('../config/db');
const User = require('../models/user.model');
const logger = require('../utils/logger');

// @desc    Obtener estadísticas del dashboard
// @route   GET /api/stats
// @access  Admin/Agent
exports.getDashboardStats = async (req, res) => {
    try {
        const pool = await poolPromise;

        // Determinar si es super admin y su departamento
        const currentUser = await User.findById(req.user.id);
        const isSuperAdmin = currentUser?.is_super_admin || false;

        // Si no es super admin, filtramos por su departamento
        let deptId = null;
        if ((req.user.role === 'admin' || req.user.role === 'agent') && !isSuperAdmin) {
            deptId = currentUser.department_id;
        }

        // 1. Contadores Globales
        const countsResult = await pool.request()
            .input('deptId', sql.Int, deptId)
            .query(`
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN status = 'open' THEN 1 END) as [open],
                    COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
                    COUNT(CASE WHEN status = 'waiting' THEN 1 END) as waiting,
                    COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed
                FROM tickets.tickets
                WHERE (@deptId IS NULL OR department_id = @deptId)
            `);
        const counts = countsResult.recordset[0];

        // 2. Tickets por Prioridad
        const priorityResult = await pool.request()
            .input('deptId', sql.Int, deptId)
            .query(`
                SELECT priority, COUNT(*) as count 
                FROM tickets.tickets 
                WHERE (@deptId IS NULL OR department_id = @deptId)
                GROUP BY priority
            `);

        // 3. Tickets por Estado
        const statusResult = await pool.request()
            .input('deptId', sql.Int, deptId)
            .query(`
                SELECT status, COUNT(*) as count 
                FROM tickets.tickets 
                WHERE (@deptId IS NULL OR department_id = @deptId)
                GROUP BY status
            `);

        // 4. Tendencia: Últimos 7 días
        const trendResult = await pool.request()
            .input('deptId', sql.Int, deptId)
            .query(`
                SELECT CONVERT(VARCHAR(10), created_at, 120) as date, COUNT(*) as count
                FROM tickets.tickets
                WHERE created_at >= DATEADD(DAY, -7, SYSDATETIME())
                  AND (@deptId IS NULL OR department_id = @deptId)
                GROUP BY CONVERT(VARCHAR(10), created_at, 120)
                ORDER BY date ASC
            `);

        // 5. Top Usuarios
        const topUsersResult = await pool.request()
            .input('deptId', sql.Int, deptId)
            .query(`
                SELECT TOP 5 u.id, u.username, u.full_name, COUNT(t.id) as ticket_count
                FROM tickets.users u
                JOIN tickets.tickets t ON u.id = t.created_by
                WHERE (@deptId IS NULL OR t.department_id = @deptId)
                GROUP BY u.id, u.username, u.full_name
                ORDER BY ticket_count DESC
            `);

        // 6. Tiempo Promedio de Resolución
        const avgResolutionResult = await pool.request()
            .input('deptId', sql.Int, deptId)
            .query(`
                SELECT AVG(CAST(DATEDIFF(SECOND, created_at, closed_at) AS FLOAT) / 3600.0) as avg_hours
                FROM tickets.tickets
                WHERE status = 'closed' AND closed_at IS NOT NULL
                  AND (@deptId IS NULL OR department_id = @deptId)
            `);

        const avgResolutionHours = parseFloat(avgResolutionResult.recordset[0].avg_hours || 0).toFixed(1);

        res.json({
            counts: {
                total: counts.total || 0,
                open: counts.open || 0,
                in_progress: counts.in_progress || 0,
                waiting: counts.waiting || 0,
                closed: counts.closed || 0
            },
            byPriority: priorityResult.recordset,
            byStatus: statusResult.recordset,
            trend: trendResult.recordset,
            topUsers: topUsersResult.recordset,
            avgResolutionHours
        });

    } catch (err) {
        logger.error(`Error fetching stats: ${err.message}`);
        res.status(500).json({ msg: 'Error del servidor al obtener estadísticas' });
    }
};
