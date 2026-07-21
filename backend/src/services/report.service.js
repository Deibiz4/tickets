const { poolPromise, sql } = require('../config/db');
const emailService = require('./email.service');
const logger = require('../utils/logger');

const sendDailyOpenTicketsReport = async (recipient) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('status', sql.VarChar, 'closed')
            .query(`
                SELECT t.id, t.title, t.priority, t.status, t.created_at, 
                       u.full_name as creator, d.name as department
                FROM tickets.tickets t
                LEFT JOIN tickets.users u ON t.created_by = u.id
                LEFT JOIN tickets.departments d ON t.department_id = d.id
                WHERE t.status != @status
                ORDER BY t.created_at ASC
            `);

        const tickets = result.recordset;

        if (tickets.length === 0) {
            await emailService.sendEmail({
                to: recipient,
                subject: 'Resumen Diario de Tickets: Sin tickets abiertos',
                html: '<h1>No hay tickets abiertos en este momento.</h1>'
            });
            return;
        }

        let ticketsHtml = `
            <h1>Resumen Diario de Tickets Abiertos</h1>
            <p>Hay <strong>${tickets.length}</strong> tickets pendientes.</p>
            <table border="1" cellpadding="5" style="border-collapse: collapse; width: 100%;">
                <thead style="background-color: #f2f2f2;">
                    <tr>
                        <th>ID</th>
                        <th>Título</th>
                        <th>Prioridad</th>
                        <th>Estado</th>
                        <th>Departamento</th>
                        <th>Solicitante</th>
                        <th>Fecha</th>
                    </tr>
                </thead>
                <tbody>
        `;

        tickets.forEach(t => {
            const priorityColor = t.priority === 'critical' ? 'red' : (t.priority === 'high' ? 'orange' : 'black');
            ticketsHtml += `
                <tr>
                    <td>#${t.id}</td>
                    <td><a href="${process.env.FRONTEND_URL || 'http://192.168.200.23:5175'}/dashboard/tickets/${t.id}">${t.title}</a></td>
                    <td style="color: ${priorityColor}; font-weight: bold;">${emailService.translate('priority', t.priority)}</td>
                    <td>${emailService.translate('status', t.status)}</td>
                    <td>${t.department || 'N/A'}</td>
                    <td>${t.creator || 'N/A'}</td>
                    <td>${new Date(t.created_at).toLocaleDateString()}</td>
                </tr>
            `;
        });

        ticketsHtml += `
                </tbody>
            </table>
        `;

        await emailService.sendEmail({
            to: recipient,
            subject: `Resumen de Tickets Abiertos (${new Date().toLocaleDateString()})`,
            html: ticketsHtml
        });

        logger.info(`Daily report sent to ${recipient}`);
    } catch (error) {
        logger.error('Error generating daily report:', error);
    }
};

const sendWeeklySummaryReport = async (recipient) => {
    try {
        const pool = await poolPromise;
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        // Tickets creados esta semana
        const createdResult = await pool.request()
            .input('startDate', sql.DateTime2, oneWeekAgo)
            .query(`
                SELECT COUNT(*) as count 
                FROM tickets.tickets 
                WHERE created_at >= @startDate
            `);

        // Tickets cerrados esta semana
        const closedResult = await pool.request()
            .input('startDate', sql.DateTime2, oneWeekAgo)
            .input('status', sql.VarChar, 'closed')
            .query(`
                SELECT COUNT(*) as count 
                FROM tickets.tickets 
                WHERE status = @status AND updated_at >= @startDate
            `);

        // Detalle de tickets cerrados (lo hecho)
        const closedDetailsResult = await pool.request()
            .input('startDate', sql.DateTime2, oneWeekAgo)
            .input('status', sql.VarChar, 'closed')
            .query(`
                SELECT t.id, t.title, t.resolution_summary, d.name as department
                FROM tickets.tickets t
                LEFT JOIN tickets.departments d ON t.department_id = d.id
                WHERE t.status = @status AND t.updated_at >= @startDate
                ORDER BY t.updated_at DESC
            `);

        const createdCount = createdResult.recordset[0].count;
        const closedCount = closedResult.recordset[0].count;
        const closedTickets = closedDetailsResult.recordset;

        let html = `
            <h1>Resumen Semanal de Actividad</h1>
            <p>Resumen de los últimos 7 días:</p>
            <ul>
                <li><strong>Tickets creados:</strong> ${createdCount}</li>
                <li><strong>Tickets cerrados:</strong> ${closedCount}</li>
            </ul>
        `;

        if (closedTickets.length > 0) {
            html += `
                <h2>Detalle de Tickets Solucionados:</h2>
                <table border="1" cellpadding="5" style="border-collapse: collapse; width: 100%;">
                    <thead style="background-color: #f2f2f2;">
                        <tr>
                            <th>ID</th>
                            <th>Título</th>
                            <th>Departamento</th>
                            <th>Resumen de Solución</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            closedTickets.forEach(t => {
                html += `
                    <tr>
                        <td>#${t.id}</td>
                        <td>${t.title}</td>
                        <td>${t.department || 'N/A'}</td>
                        <td>${t.resolution_summary || 'Sin resumen'}</td>
                    </tr>
                `;
            });

            html += `
                    </tbody>
                </table>
            `;
        } else {
            html += `<p>No se han cerrado tickets esta semana.</p>`;
        }

        await emailService.sendEmail({
            to: recipient,
            subject: `Resumen Semanal de Tickets - Jata`,
            html: html
        });

        logger.info(`Weekly report sent to ${recipient}`);
    } catch (error) {
        logger.error('Error generating weekly report:', error);
    }
};

module.exports = {
    sendDailyOpenTicketsReport,
    sendWeeklySummaryReport
};
