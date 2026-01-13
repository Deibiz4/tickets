const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
    tls: {
        rejectUnauthorized: false
    }
});

const sendEmail = async ({ to, subject, html }) => {
    try {
        const info = await transporter.sendMail({
            from: `Ticketing Jata <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
            to,
            subject,
            html,
        });
        console.log('Message sent: %s', info.messageId);
        return info;
    } catch (error) {
        console.error('Error sending email:', error);
        // Don't throw error to avoid breaking the main request flow
        return null;
    }
};

const LABELS = {
    status: {
        open: 'Abierto',
        in_progress: 'En Progreso',
        waiting: 'En Espera',
        closed: 'Cerrado'
    },
    priority: {
        low: 'Baja',
        medium: 'Media',
        high: 'Alta',
        critical: 'Crítica'
    }
};

const translate = (type, value) => {
    return LABELS[type]?.[value] || value;
};

const sendNewTicketNotification = async (ticket, adminEmails) => {
    const subject = `Nuevo Ticket #[${ticket.id}]: ${ticket.title}`;
    const priorityLabel = translate('priority', ticket.priority);

    const html = `
    <h1>Nuevo Ticket Creado</h1>
    <p><strong>Usuario:</strong> ${ticket.username}</p>
    <p><strong>Título:</strong> ${ticket.title}</p>
    <p><strong>Prioridad:</strong> ${priorityLabel}</p>
    <p><strong>Descripción:</strong></p>
    <p>${ticket.description}</p>
    <br>
    <a href="${process.env.FRONTEND_URL || 'http://localhost:5175'}/dashboard/tickets/${ticket.id}">Ver Ticket</a>
  `;

    // Enviar a lista de admins/agentes
    // Por simplicidad, si adminEmails es string lo usamos, si es array lo unimos
    const to = Array.isArray(adminEmails) ? adminEmails.join(', ') : adminEmails;

    if (to) {
        await sendEmail({ to, subject, html });
    }
};

const sendNewCommentNotification = async (ticket, comment, recipientEmail) => {
    const subject = `Nueva respuesta en Ticket #[${ticket.id}]: ${ticket.title}`;
    const html = `
    <h1>Nueva respuesta</h1>
    <p><strong>Ticket:</strong> ${ticket.title}</p>
    <p><strong>Autor:</strong> ${comment.username}</p>
    <p><strong>Comentario:</strong></p>
    <div style="background-color: #f9f9f9; padding: 10px; border-left: 3px solid #007bff;">
        ${comment.content}
    </div>
    <br>
    <a href="${process.env.FRONTEND_URL || 'http://localhost:5175'}/dashboard/tickets/${ticket.id}">Ver Ticket</a>
  `;

    if (recipientEmail) {
        await sendEmail({ to: recipientEmail, subject, html });
    }
};

const sendTicketUpdateNotification = async (ticket, changes, recipientEmails) => {
    const subject = `Actualización en Ticket #[${ticket.id}]: ${ticket.title}`;

    let changesHtml = '';
    if (changes.status) {
        const oldStatus = translate('status', changes.status.old);
        const newStatus = translate('status', changes.status.new);
        changesHtml += `<p><strong>Estado:</strong> ${oldStatus} &rarr; <strong>${newStatus}</strong></p>`;
    }
    if (changes.priority) {
        const oldPriority = translate('priority', changes.priority.old);
        const newPriority = translate('priority', changes.priority.new);
        changesHtml += `<p><strong>Prioridad:</strong> ${oldPriority} &rarr; <strong>${newPriority}</strong></p>`;
    }
    if (changes.assigned_to) {
        changesHtml += `<p><strong>Asignado a:</strong> ${changes.assigned_to.old || 'Nadie'} &rarr; <strong>${changes.assigned_to.newName}</strong></p>`;
    }

    const html = `
    <h1>El ticket ha sido actualizado</h1>
    <p><strong>Ticket:</strong> ${ticket.title}</p>
    <p><strong>Cambios realizados:</strong></p>
    ${changesHtml}
    <br>
    <p>Puede ver los detalles completos aquí:</p>
    <a href="${process.env.FRONTEND_URL || 'http://localhost:5175'}/dashboard/tickets/${ticket.id}">Ver Ticket</a>
  `;

    // Ensure recipientEmails is an array or handled correctly if string
    const to = Array.isArray(recipientEmails) ? recipientEmails.join(', ') : recipientEmails;

    if (to) {
        await sendEmail({ to, subject, html });
    }
};

module.exports = {
    sendEmail,
    sendNewTicketNotification,
    sendNewCommentNotification,
    sendTicketUpdateNotification
};
