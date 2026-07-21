const Ticket = require('../models/ticket.model');
const Attachment = require('../models/attachment.model');
const Comment = require('../models/comment.model');
const logger = require('../utils/logger');
const { generateKBArticleForTicket } = require('../services/kbAutoGenerator');

// @desc    Obtener todos los tickets
// @route   GET /api/tickets
// @access  Privado
exports.getTickets = async (req, res, next) => {

  try {
    const User = require('../models/user.model');

    // Users only see their own tickets
    const userId = req.user.role === 'user' ? req.user.id : null;

    // Get current user to determine if super admin
    const currentUser = await User.findById(req.user.id);
    console.log(`getTickets: user=${req.user.email}, is_super_admin=${currentUser?.is_super_admin}, dept=${currentUser?.department_id}`);

    // If admin/agent but NOT super admin, filter by their department
    let userDepartmentId = null;
    let adminUserId = null;
    if ((req.user.role === 'admin' || req.user.role === 'agent')
      && !currentUser?.is_super_admin) {
      userDepartmentId = currentUser?.department_id;
      adminUserId = req.user.id;
    }
    console.log(`getTickets: final userDepartmentId filter=${userDepartmentId}`);

    // Extract query parameters for filtering and sorting
    const filters = {
      userId,
      userDepartmentId,
      adminUserId,
      userDepartmentIdForVisibility: currentUser?.department_id,
      priority: req.query.priority,
      status: req.query.status,
      departmentId: req.query.departmentId,  // Changed from 'department'
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

    // Validate department access for admins/agents
    if (req.user.role !== 'user') {
      const User = require('../models/user.model');
      const currentUser = await User.findById(req.user.id);

      // If not super admin, verify department access
      if (!currentUser.is_super_admin
        && ticket.department_id !== currentUser.department_id
        && ticket.created_by !== req.user.id
        && ticket.visibility !== 'public') {
        return res.status(403).json({
          msg: 'No tienes acceso a tickets de otros departamentos'
        });
      }
    } else {
      if (ticket.created_by !== req.user.id && ticket.visibility !== 'public') {
        const User = require('../models/user.model');
        const currentUser = await User.findById(req.user.id);
        if (ticket.visibility !== 'department' || ticket.department_id !== currentUser.department_id) {
          return res.status(403).json({
            msg: 'No tienes acceso a este ticket'
          });
        }
      }
    }

    // Hide resolution info for non-admins
    if (req.user.role !== 'admin') {
      delete ticket.resolution_summary;
      delete ticket.resolution_actions;
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
    const { title, description, priority, departmentId, visibility } = req.body;

    // Validate departmentId is present
    if (!departmentId) {
      return res.status(400).json({
        msg: 'Debe seleccionar un departamento para el ticket'
      });
    }

    // Validate that department exists
    const Department = require('../models/department.model');
    const department = await Department.findById(departmentId);
    if (!department) {
      return res.status(400).json({
        msg: 'El departamento seleccionado no existe'
      });
    }

    const ticket = await Ticket.create({
      title,
      description,
      priority,
      status: 'open',
      createdBy: req.user.id,
      departmentId,
      visibility: visibility || 'private'
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
    (async () => {
      try {
        const { sendNewTicketNotification } = require('../services/email.service');
        const User = require('../models/user.model');
        const NotificationModel = require('../models/notification.model');

        const isEnabled = await NotificationModel.isEnabled('new_ticket');
        if (!isEnabled) return;

        // Determinar destinatarios según visibilidad
        let adminEmails = [];
        if (ticket.visibility === 'public') {
          adminEmails = await User.getAllSystemEmails();
        } else if (ticket.visibility === 'department') {
          adminEmails = await User.getDepartmentEmails(ticket.department_id);
        } else {
          adminEmails = await User.getAdminEmailsByDepartment(ticket.department_id);
        }

        // Obtener el usuario actual para tener el username correcto
        const currentUser = await User.findById(req.user.id);
        // Get department info for email
        const Department = require('../models/department.model');
        const dept = await Department.findById(ticket.department_id);

        if (adminEmails.length > 0 && currentUser) {
          await sendNewTicketNotification({
            ...ticket,
            username: currentUser.username,
            department_name: dept ? dept.name : 'N/A'
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
    const { title, description, status, priority, assignedTo, createdBy, departmentId, visibility } = req.body;

    let ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ msg: 'Ticket no encontrado' });
    }

    // Verificar que el usuario sea el creador o admin
    if (ticket.created_by != req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ msg: 'No autorizado' });
    }

    // Validate department access for admins
    if (req.user.role === 'admin') {
      const User = require('../models/user.model');
      const currentUser = await User.findById(req.user.id);

      if (!currentUser.is_super_admin
        && ticket.department_id !== currentUser.department_id
        && ticket.created_by !== req.user.id) {
        return res.status(403).json({
          msg: 'No puedes editar tickets de otros departamentos'
        });
      }
    }

    const updates = {};
    if (title) updates.title = title;
    if (description) updates.description = description;
    if (status) {
      updates.status = status;

      // Validation for closing ticket by admin
      if (status === 'closed' && req.user.role === 'admin') {
        const { resolutionSummary, resolutionActions } = req.body;
        if (!resolutionSummary || !resolutionActions) {
          return res.status(400).json({
            msg: 'Para cerrar un ticket, debes completar el resumen y las acciones tomadas.'
          });
        }
        updates.resolution_summary = resolutionSummary;
        updates.resolution_actions = resolutionActions;
      }
    }
    if (priority) updates.priority = priority;
    if (visibility) updates.visibility = visibility;

    // Asignación de usuario
    if (assignedTo !== undefined && assignedTo !== null) {
      if (assignedTo) {
        const User = require('../models/user.model');
        const assignee = await User.findById(assignedTo);
        if (!assignee) {
          return res.status(400).json({ msg: 'El usuario asignado no existe' });
        }
        if (req.user.role !== 'admin' && assignee.department_id !== (departmentId || ticket.department_id)) {
          return res.status(400).json({ msg: 'Solo puedes asignar usuarios del mismo departamento del ticket' });
        }
        updates.assigned_to = assignedTo;
      } else {
        // null o 0 = des-asignar
        updates.assigned_to = null;
      }
    }

    if (req.user.role === 'admin') {
      if (createdBy) {
        updates.created_by = createdBy;
      }
      if (departmentId) {
        updates.department_id = departmentId;
      }
    }

    const updatedTicket = await Ticket.update(req.params.id, updates);

    res.json(updatedTicket);

    // Generar artículo de KB automáticamente si el ticket se cierra
    if (status === 'closed' && ticket.status !== 'closed') {
      generateKBArticleForTicket(req.params.id, req.user.id);
    }

    // Notificaciones por correo con debounce (agrupa cambios del mismo ticket en 5 min)
    (async () => {
      try {
        const { sendGroupedNotification } = require('../services/email.service');
        const { enqueue } = require('../services/notificationDebounce.service');
        const User = require('../models/user.model');
        const NotificationModel = require('../models/notification.model');

        const isEnabled = await NotificationModel.isEnabled('ticket_update');
        if (!isEnabled) return;

        const currentUser = await User.findById(req.user.id);
        const currentUsername = currentUser ? currentUser.username : (req.user.username || 'Sistema');

        const changes = {};
        if (title && title !== ticket.title) changes.title = { old: ticket.title, new: title };
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

        if (Object.keys(changes).length > 0) {
          const recipients = new Set();
          const creator = await User.findById(ticket.created_by);
          if (creator) recipients.add(creator.email);
          if (updatedTicket.assigned_to) {
            const assignee = await User.findById(updatedTicket.assigned_to);
            if (assignee) recipients.add(assignee.email);
          }
          if (req.user.email) recipients.add(req.user.email);

          if (recipients.size > 0) {
            enqueue(
              String(req.params.id),
              {
                type: 'update',
                timestamp: new Date(),
                data: { changes, updaterName: currentUsername, ticketTitle: ticket.title }
              },
              Array.from(recipients),
              sendGroupedNotification
            );
          }
        }
      } catch (notifyErr) {
        console.error('Error enqueuing update notification:', notifyErr);
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

    // Validate department access
    const User = require('../models/user.model');
    const currentUser = await User.findById(req.user.id);

    if (!currentUser.is_super_admin
      && ticket.department_id !== currentUser.department_id) {
      return res.status(403).json({
        msg: 'No puedes eliminar tickets de otros departamentos'
      });
    }

    await Ticket.delete(req.params.id);
    res.json({ msg: 'Ticket eliminado' });
  } catch (err) {
    logger.error(`Error in deleteTicket: ${err.stack}`);
    res.status(500).json({ msg: 'Error del servidor' });
  }
};
