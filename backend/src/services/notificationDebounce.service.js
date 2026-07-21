/**
 * Notification Debounce Service
 * 
 * Agrupa las notificaciones del mismo ticket en una ventana de tiempo (por defecto 5 minutos)
 * para evitar spam de correos cuando se hacen varios cambios seguidos.
 */

const logger = require('../utils/logger');

// Ventana de agrupación en milisegundos (5 minutos)
const DEBOUNCE_WINDOW_MS = 5 * 60 * 1000;

// Map: ticketId -> { timer, events: [], recipients: Set }
const pendingNotifications = new Map();

/**
 * Encola un evento de notificación para un ticket.
 * Si ya hay un evento pendiente para ese ticket, lo agrupa y reinicia el timer.
 *
 * @param {string} ticketId
 * @param {Object} event - { type: 'update'|'comment', data: {...} }
 * @param {string[]} recipients - array de emails
 * @param {Function} sendFn - función async que recibe (events, recipients) y envía el correo
 */
const enqueue = (ticketId, event, recipients, sendFn) => {
    if (pendingNotifications.has(ticketId)) {
        const pending = pendingNotifications.get(ticketId);

        // Agregar los nuevos recipients al Set existente
        recipients.forEach(r => pending.recipients.add(r));

        // Agregar el evento a la lista
        pending.events.push(event);

        // Reiniciar el timer (debounce)
        clearTimeout(pending.timer);
        pending.timer = setTimeout(() => flush(ticketId, sendFn), DEBOUNCE_WINDOW_MS);

        logger.info(`[Debounce] Ticket #${ticketId}: evento agregado (${pending.events.length} eventos en cola)`);
    } else {
        // Primera notificación para este ticket: crear entrada nueva
        const recipientSet = new Set(recipients);
        const timer = setTimeout(() => flush(ticketId, sendFn), DEBOUNCE_WINDOW_MS);

        pendingNotifications.set(ticketId, {
            timer,
            events: [event],
            recipients: recipientSet,
            sendFn
        });

        logger.info(`[Debounce] Ticket #${ticketId}: nueva cola creada, enviará en ${DEBOUNCE_WINDOW_MS / 1000}s`);
    }
};

/**
 * Envía inmediatamente todas las notificaciones pendientes para un ticket y limpia la cola.
 */
const flush = async (ticketId, sendFn) => {
    if (!pendingNotifications.has(ticketId)) return;

    const pending = pendingNotifications.get(ticketId);
    pendingNotifications.delete(ticketId);

    const { events, recipients } = pending;
    const recipientList = Array.from(recipients);

    logger.info(`[Debounce] Ticket #${ticketId}: enviando resumen de ${events.length} evento(s) a ${recipientList.join(', ')}`);

    try {
        await sendFn(ticketId, events, recipientList);
    } catch (err) {
        logger.error(`[Debounce] Error enviando notificación agrupada para ticket #${ticketId}: ${err.message}`);
    }
};

module.exports = { enqueue };
