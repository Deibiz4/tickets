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

        // Validate department access for admins/agents
        if (req.user.role === 'admin' || req.user.role === 'agent') {
            const User = require('../models/user.model');
            const currentUser = await User.findById(req.user.id);

            if (!currentUser.is_super_admin
                && ticket.department_id !== currentUser.department_id) {
                return res.status(403).json({
                    msg: 'No tienes acceso a comentarios de tickets de otros departamentos'
                });
            }
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

        // Validate department access for admins/agents
        if (req.user.role === 'admin' || req.user.role === 'agent') {
            const User = require('../models/user.model');
            const currentUser = await User.findById(req.user.id);

            if (!currentUser.is_super_admin
                && ticket.department_id !== currentUser.department_id) {
                return res.status(403).json({
                    msg: 'No tienes acceso a este ticket'
                });
            }
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

        // Enviar notificación con debounce (agrupa eventos del mismo ticket en 5 min)
        const { sendGroupedNotification } = require('../services/email.service');
        const { enqueue } = require('../services/notificationDebounce.service');
        const User = require('../models/user.model');
        const NotificationModel = require('../models/notification.model');

        (async () => {
            try {
                const isEnabled = await NotificationModel.isEnabled('new_comment');
                if (!isEnabled) return;

                const currentUser = await User.findById(req.user.id);
                const currentUsername = currentUser ? currentUser.username : (req.user.username || 'Sistema');

                let recipientEmail = null;
                if (req.user.role === 'user') {
                    if (ticket.assigned_to) {
                        const agent = await User.findById(ticket.assigned_to);
                        recipientEmail = agent ? agent.email : null;
                    }
                } else {
                    const creator = await User.findById(ticket.created_by);
                    recipientEmail = creator ? creator.email : null;
                }

                const recipients = new Set();
                if (recipientEmail) recipients.add(recipientEmail);
                if (req.user.email) recipients.add(req.user.email);

                if (recipients.size > 0) {
                    enqueue(
                        String(id),
                        {
                            type: 'comment',
                            timestamp: new Date(),
                            data: {
                                username: currentUsername,
                                content: content || 'Archivo adjunto',
                                ticketTitle: ticket.title
                            }
                        },
                        Array.from(recipients),
                        sendGroupedNotification
                    );
                }
            } catch (notifyErr) {
                console.error('Error enqueuing comment notification:', notifyErr);
            }
        })();

        res.json({ comment, attachment });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Error del servidor');
    }
};
