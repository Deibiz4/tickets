const Ticket = require('../models/ticket.model');
const Attachment = require('../models/attachment.model');
const Comment = require('../models/comment.model');
const logger = require('../utils/logger');

// @desc    Obtener todos los tickets
// @route   GET /api/tickets
// @access  Privado
exports.getTickets = async (req, res, next) => {

  try {
    const userId = req.user.role === 'user' ? req.user.id : null;

    // Extract query parameters for filtering and sorting
    const filters = {
      userId,
      priority: req.query.priority,
      status: req.query.status,
      department: req.query.department,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      sortBy: req.query.sortBy,
      sortOrder: req.query.sortOrder,
      search: req.query.search
    };

    const tickets = await Ticket.find(filters);

    res.json(tickets);
  } catch (err) {
    logger.error(`Error in getTickets: ${err.stack}`);
    res.status(500).json({ msg: 'Error del servidor' });
  }
};

// @desc    Obtener un ticket por ID
// @route   GET /api/tickets/:id
// @access  Privado
exports.getTicketById = async (req, res, next) => {
  try {
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ msg: 'Ticket no encontrado' });
    }

    res.json(ticket);
  } catch (err) {
    logger.error(`Error in getTicketById: ${err.stack}`);
    res.status(500).json({ msg: 'Error del servidor' });
  }
};

// @desc    Crear un nuevo ticket
// @route   POST /api/tickets
// @access  Privado
exports.createTicket = async (req, res, next) => {

  try {
    const { title, description, priority } = req.body;


    const ticket = await Ticket.create({
      title,
      description,
      priority,
      status: 'open',
      createdBy: req.user.id
    });


    // Manejar adjunto inicial si existe
    if (req.file) {
      try {
        const comment = await Comment.create({
          ticketId: ticket.id,
          userId: req.user.id,
          content: 'Archivo adjunto inicial'
        });

        await Attachment.create({
          ticketId: ticket.id,
          commentId: comment.id,
          fileName: req.file.originalname,
          filePath: req.file.path,
          fileSize: req.file.size,
          mimeType: req.file.mimetype,
          uploadedBy: req.user.id
        });
      } catch (fileErr) {
        console.error('Error saving initial attachment:', fileErr);
        // No fallamos la request completa, pero logueamos el error
      }
    }

    res.json(ticket);

    // Enviar notificación por correo (async)
    // No bloqueamos la respuesta, y manejamos errores aquí para no afectar el flujo principal
    (async () => {
      try {
        const { sendNewTicketNotification } = require('../services/email.service');
        const User = require('../models/user.model');
        const NotificationModel = require('../models/notification.model');

        const isEnabled = await NotificationModel.isEnabled('new_ticket');
        if (!isEnabled) return;

        const users = await User.getAllUsers();
        // Obtener el usuario actual para tener el username correcto
        const currentUser = await User.findById(req.user.id);

        const adminEmails = users
          .filter(u => u.role === 'admin' || u.role === 'agent')
          .map(u => u.email);

        if (adminEmails.length > 0 && currentUser) {
          await sendNewTicketNotification({
            ...ticket,
            username: currentUser.username
          }, adminEmails);
        }
      } catch (emailErr) {
        console.error('Error sending notification (logic or module):', emailErr);
      }
    })();
  } catch (err) {
    if (!res.headersSent) {
      logger.error(`Error in createTicket: ${err.stack}`);
      res.status(500).json({ msg: 'Error del servidor' });
    } else {
      logger.error(`Error after headers sent in createTicket: ${err.message}`);
    }
  }
};

// @desc    Actualizar un ticket
// @route   PUT /api/tickets/:id
// @access  Privado
exports.updateTicket = async (req, res, next) => {
  try {
    const { title, description, status, priority, assignedTo } = req.body;

    let ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ msg: 'Ticket no encontrado' });
    }

    // Verificar que el usuario sea el creador o admin
    // Note: In SQL result, created_by is an integer ID, req.user.id is from JWT (also integer/string)
    if (ticket.created_by != req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ msg: 'No autorizado' });
    }

    const updates = {};
    if (title) updates.title = title;
    if (description) updates.description = description;
    if (status) updates.status = status;
    if (priority) updates.priority = priority;
    if (assignedTo) updates.assigned_to = assignedTo;

    const updatedTicket = await Ticket.update(req.params.id, updates);

    res.json(updatedTicket);

    // Notificaciones por correo (Async)
    (async () => {
      try {
        const { sendTicketUpdateNotification } = require('../services/email.service');
        const User = require('../models/user.model');
        const NotificationModel = require('../models/notification.model');

        const isEnabled = await NotificationModel.isEnabled('ticket_update');
        if (!isEnabled) return;

        const changes = {};
        if (title && title !== ticket.title) changes.title = { old: ticket.title, new: title }; // Usually not notified but useful
        if (status && status !== ticket.status) changes.status = { old: ticket.status, new: status };
        if (priority && priority !== ticket.priority) changes.priority = { old: ticket.priority, new: priority };

        let assignedUser = null;
        if (assignedTo && assignedTo != ticket.assigned_to) {
          assignedUser = await User.findById(assignedTo);
          changes.assigned_to = {
            old: ticket.assigned_to,
            new: assignedTo,
            newName: assignedUser ? assignedUser.username : 'Unknown'
          };
        }

        // Si hubo cambios relevantes
        if (Object.keys(changes).length > 0) {
          const recipients = new Set();

          // 1. Dueño del ticket
          const creator = await User.findById(ticket.created_by);
          if (creator) recipients.add(creator.email);

          // 2. Agente asignado (Si hay uno nuevo, avisarle. Si había uno viejo, avisarle también opcionalmente)
          if (updatedTicket.assigned_to) {
            const assignee = await User.findById(updatedTicket.assigned_to);
            if (assignee) recipients.add(assignee.email);
          }

          // NOTA: Se permiten notificaciones al propio actor para confirmar cambios.
          if (req.user.email) {
            recipients.add(req.user.email);
          }

          if (recipients.size > 0) {
            await sendTicketUpdateNotification(updatedTicket, changes, Array.from(recipients));
          }
        }
      } catch (notifyErr) {
        console.error('Error sending update notification:', notifyErr);
      }
    })();
  } catch (err) {
    logger.error(`Error in updateTicket: ${err.stack}`);
    res.status(500).json({ msg: 'Error del servidor' });
  }
};

// @desc    Eliminar un ticket
// @route   DELETE /api/tickets/:id
// @access  Privado (solo admin)
exports.deleteTicket = async (req, res, next) => {
  try {
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ msg: 'Ticket no encontrado' });
    }

    // Verificar que el usuario sea admin
    if (req.user.role !== 'admin') {
      return res.status(401).json({ msg: 'No autorizado' });
    }

    await Ticket.delete(req.params.id);
    res.json({ msg: 'Ticket eliminado' });
  } catch (err) {
    logger.error(`Error in deleteTicket: ${err.stack}`);
    res.status(500).json({ msg: 'Error del servidor' });
  }
};
