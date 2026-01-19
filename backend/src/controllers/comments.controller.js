const Comment = require('../models/comment.model');
const Attachment = require('../models/attachment.model');
const Ticket = require('../models/ticket.model');

// @desc    Obtener comentarios de un ticket
// @route   GET /api/tickets/:id/comments
// @access  Privado
exports.getComments = async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar acceso al ticket
        const ticket = await Ticket.findById(id);
        if (!ticket) {
            return res.status(404).json({ msg: 'Ticket no encontrado' });
        }

        if (ticket.created_by != req.user.id && req.user.role === 'user') {
            return res.status(401).json({ msg: 'No autorizado' });
        }

        const comments = await Comment.findByTicketId(id);
        const attachments = await Attachment.findByTicketId(id);

        // Combinar comentarios con sus adjuntos si es necesario, 
        // o devolver ambos para manejar en el frontend
        res.json({ comments, attachments });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Error del servidor');
    }
};

// @desc    Agregar comentario (y adjunto opcional)
// @route   POST /api/tickets/:id/comments
// @access  Privado
exports.addComment = async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;
        const file = req.file;

        // Verificar acceso
        const ticket = await Ticket.findById(id);
        if (!ticket) {
            return res.status(404).json({ msg: 'Ticket no encontrado' });
        }

        if (ticket.created_by != req.user.id && req.user.role === 'user') {
            return res.status(401).json({ msg: 'No autorizado' });
        }

        // Crear comentario
        const comment = await Comment.create({
            ticketId: id,
            userId: req.user.id,
            content: content || (file ? 'Adjuntó un archivo' : '')
        });

        let attachment = null;
        if (file) {
            attachment = await Attachment.create({
                ticketId: id,
                commentId: comment.id,
                fileName: file.originalname,
                filePath: file.path,
                fileSize: file.size,
                mimeType: file.mimetype,
                uploadedBy: req.user.id
            });
        }

        // Enviar notificación (async)
        // Lógica: Si el autor es User -> Notificar Admin/Agente
        // Si el autor es Admin/Agente -> Notificar al Dueño del Ticket
        const { sendNewCommentNotification } = require('../services/email.service');
        const User = require('../models/user.model');
        const NotificationModel = require('../models/notification.model');

        (async () => {
            try {
                const isEnabled = await NotificationModel.isEnabled('new_comment');
                if (!isEnabled) return;

                let recipientEmail = null;

                if (req.user.role === 'user') {
                    // Notificar a quien corresponda (assigned_to o admins)
                    if (ticket.assigned_to) {
                        const agent = await User.findById(ticket.assigned_to);
                        recipientEmail = agent ? agent.email : null;
                    }
                } else {
                    // Es admin o agente -> Notificar al usuario creador
                    const creator = await User.findById(ticket.created_by);
                    recipientEmail = creator ? creator.email : null;
                }

                // [MODIFIED] Agregar al remitente a la lista de notificaciones (CC)
                // Usamos un Set para evitar duplicados si el remitente es el mismo que el destinatario
                const recipients = new Set();
                if (recipientEmail) recipients.add(recipientEmail);
                if (req.user.email) recipients.add(req.user.email);

                const finalRecipients = Array.from(recipients).join(', ');

                if (finalRecipients) {
                    await sendNewCommentNotification(ticket, {
                        username: req.user.username,
                        content: content || 'Archivo adjunto'
                    }, finalRecipients);
                }
            } catch (notifyErr) {
                console.error('Error sending comment notification:', notifyErr);
            }
        })();

        res.json({ comment, attachment });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Error del servidor');
    }
};
