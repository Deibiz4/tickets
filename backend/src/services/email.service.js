const nodemailer = require('nodemailer');

let smtpPass = process.env.SMTP_PASS;
if (smtpPass && smtpPass.startsWith('"') && smtpPass.endsWith('"')) {
    smtpPass = smtpPass.substring(1, smtpPass.length - 1);
}

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: false, // STARTTLS on port 587
    auth: {
        user: process.env.SMTP_USER,
        pass: smtpPass,
    },
    tls: {
        rejectUnauthorized: false
    }
});

const sendEmail = async ({ to, subject, html }) => {
    const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER;
    
    let targetTo = to;

    try {
        const info = await transporter.sendMail({
            from: `Ticketing Jata <${fromAddress}>`,
            to: targetTo,
            subject,
            html,
        });
        console.log('[EMAIL] Sent to %s | from: %s | id: %s', targetTo, fromAddress, info.messageId);
        return info;
    } catch (error) {
        console.error('[EMAIL] Failed to send to %s | from: %s | host: %s:%s | error: %s',
            targetTo, fromAddress,
            process.env.SMTP_HOST, process.env.SMTP_PORT,
            error.message
        );
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
    <p><strong>Departamento:</strong> ${ticket.department_name || 'N/A'}</p>
    <p><strong>Usuario:</strong> ${ticket.username}</p>
    <p><strong>Título:</strong> ${ticket.title}</p>
    <p><strong>Prioridad:</strong> ${priorityLabel}</p>
    <p><strong>Descripción:</strong></p>
    <p>${ticket.description}</p>
    <br>
    <a href="${process.env.FRONTEND_URL || 'http://192.168.200.23:5175'}/dashboard/tickets/${ticket.id}">Ver Ticket</a>
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
    <a href="${process.env.FRONTEND_URL || 'http://192.168.200.23:5175'}/dashboard/tickets/${ticket.id}">Ver Ticket</a>
  `;

    if (recipientEmail) {
        await sendEmail({ to: recipientEmail, subject, html });
    }
};

const sendTicketUpdateNotification = async (ticket, changes, recipientEmails, updaterName) => {
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
    <p><strong>Autor del cambio:</strong> ${updaterName || 'N/A'}</p>
    <p><strong>Cambios realizados:</strong></p>
    ${changesHtml}
    <br>
    <p>Puede ver los detalles completos aquí:</p>
    <a href="${process.env.FRONTEND_URL || 'http://192.168.200.23:5175'}/dashboard/tickets/${ticket.id}">Ver Ticket</a>
  `;

    // Ensure recipientEmails is an array or handled correctly if string
    const to = Array.isArray(recipientEmails) ? recipientEmails.join(', ') : recipientEmails;

    if (to) {
        await sendEmail({ to, subject, html });
    }
};

/**
 * Envía un correo resumen agrupando varios eventos (updates + comments) de un mismo ticket.
 * Esta función es llamada por el sistema de debounce.
 */
const sendGroupedNotification = async (ticketId, events, recipientEmails) => {
    if (!events || events.length === 0 || !recipientEmails || recipientEmails.length === 0) return;

    // Obtener título del ticket del primer evento
    const firstEvent = events[0];
    const ticketTitle = firstEvent.data?.ticketTitle || `Ticket #${ticketId}`;
    const ticketUrl = `${process.env.FRONTEND_URL || 'http://192.168.200.23:5175'}/dashboard/tickets/${ticketId}`;

    let eventsHtml = '';

    events.forEach((event, idx) => {
        const time = new Date(event.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

        if (event.type === 'update') {
            const { changes, updaterName } = event.data;
            let changesText = '';
            if (changes.status) changesText += `<li>Estado: <strong>${translate('status', changes.status.old)}</strong> → <strong>${translate('status', changes.status.new)}</strong></li>`;
            if (changes.priority) changesText += `<li>Prioridad: <strong>${translate('priority', changes.priority.old)}</strong> → <strong>${translate('priority', changes.priority.new)}</strong></li>`;
            if (changes.assigned_to) changesText += `<li>Asignado a: <strong>${changes.assigned_to.newName}</strong></li>`;

            if (changesText) {
                eventsHtml += `
                <div style="margin-bottom:16px; padding:12px; background:#f8f9fa; border-left:3px solid #0066cc; border-radius:4px;">
                    <p style="margin:0 0 6px 0; color:#555; font-size:12px;">[${time}] <strong>${updaterName || 'Sistema'}</strong> actualizó el ticket:</p>
                    <ul style="margin:0; padding-left:20px;">${changesText}</ul>
                </div>`;
            }
        } else if (event.type === 'comment') {
            const { username, content } = event.data;
            eventsHtml += `
            <div style="margin-bottom:16px; padding:12px; background:#f0f7ff; border-left:3px solid #28a745; border-radius:4px;">
                <p style="margin:0 0 6px 0; color:#555; font-size:12px;">[${time}] <strong>${username || 'Usuario'}</strong> añadió una respuesta:</p>
                <div style="color:#333;">${content || '(sin contenido)'}</div>
            </div>`;
        }
    });

    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <h2 style="color:#0066cc;">Resumen de actividad en ticket</h2>
        <p><strong>Ticket:</strong> <a href="${ticketUrl}">${ticketTitle}</a></p>
        <p style="color:#777; font-size:13px;">Se han agrupado ${events.length} notificación(es) para evitar spam:</p>
        <hr style="border:none; border-top:1px solid #eee; margin:16px 0;">
        ${eventsHtml}
        <hr style="border:none; border-top:1px solid #eee; margin:16px 0;">
        <p><a href="${ticketUrl}" style="background:#0066cc; color:white; padding:8px 16px; text-decoration:none; border-radius:4px;">Ver Ticket Completo</a></p>
    </div>
    `;

    const to = recipientEmails.join(', ');
    const subject = `[${events.length} notif.] Ticket: ${ticketTitle}`;
    await sendEmail({ to, subject, html });
};

const sendPasswordResetEmail = async (email, resetUrl) => {
    const subject = 'Restablecer contraseña - Sistema de Tickets';
    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <h2 style="color:#0066cc;">Restablecer contraseña</h2>
        <p>Has solicitado restablecer tu contraseña. Haz clic en el siguiente enlace para continuar:</p>
        <p style="margin: 24px 0;">
            <a href="${resetUrl}" style="background:#0066cc; color:white; padding:10px 20px; text-decoration:none; border-radius:4px;">
                Restablecer contraseña
            </a>
        </p>
        <p style="color:#777; font-size:13px;">Este enlace expira en <strong>1 hora</strong>.</p>
        <p style="color:#777; font-size:13px;">Si no solicitaste esto, ignora este correo.</p>
    </div>
    `;
    await sendEmail({ to: email, subject, html });
};

module.exports = {
    sendEmail,
    sendNewTicketNotification,
    sendNewCommentNotification,
    sendTicketUpdateNotification,
    sendGroupedNotification,
    sendPasswordResetEmail,
    translate
};
