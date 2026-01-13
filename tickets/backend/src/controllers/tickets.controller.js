const Ticket = require('../models/ticket.model');
const { validationResult } = require('express-validator');

// @desc    Obtener todos los tickets
// @route   GET /api/tickets
// @access  Privado
exports.getTickets = async (req, res, next) => {
  try {
    const tickets = await Ticket.find().sort({ createdAt: -1 });
    res.json(tickets);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error del servidor');
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
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Ticket no encontrado' });
    }
    res.status(500).send('Error del servidor');
  }
};

// @desc    Crear un nuevo ticket
// @route   POST /api/tickets
// @access  Privado
exports.createTicket = async (req, res, next) => {
  try {
    const { title, description, priority } = req.body;

    const newTicket = new Ticket({
      title,
      description,
      priority,
      status: 'abierto',
      createdBy: req.user.id,
      assignedTo: null
    });

    const ticket = await newTicket.save();
    res.json(ticket);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error del servidor');
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
    if (ticket.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ msg: 'No autorizado' });
    }

    const ticketFields = {};
    if (title) ticketFields.title = title;
    if (description) ticketFields.description = description;
    if (status) ticketFields.status = status;
    if (priority) ticketFields.priority = priority;
    if (assignedTo) ticketFields.assignedTo = assignedTo;

    ticket = await Ticket.findByIdAndUpdate(
      req.params.id,
      { $set: ticketFields },
      { new: true }
    );

    res.json(ticket);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error del servidor');
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

    await ticket.remove();
    res.json({ msg: 'Ticket eliminado' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Ticket no encontrado' });
    }
    res.status(500).send('Error del servidor');
  }
};
