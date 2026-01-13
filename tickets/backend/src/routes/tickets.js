const express = require('express');
const { check } = require('express-validator');
const ticketsController = require('../controllers/tickets.controller');
const { validateRequest } = require('../middleware/validateRequest');
const { auth } = require('../middleware/auth');

const router = express.Router();

// @route   GET api/tickets
// @desc    Obtener todos los tickets
// @access  Privado
router.get('/', auth, ticketsController.getTickets);

// @route   GET api/tickets/:id
// @desc    Obtener un ticket por ID
// @access  Privado
router.get('/:id', auth, ticketsController.getTicketById);

// @route   POST api/tickets
// @desc    Crear un nuevo ticket
// @access  Privado
router.post(
  '/',
  [
    auth,
    [
      check('title', 'El título es obligatorio').not().isEmpty(),
      check('description', 'La descripción es obligatoria').not().isEmpty(),
      check('priority', 'La prioridad es obligatoria').isIn(['baja', 'media', 'alta']),
    ],
  ],
  validateRequest,
  ticketsController.createTicket
);

// @route   PUT api/tickets/:id
// @desc    Actualizar un ticket
// @access  Privado
router.put(
  '/:id',
  [
    auth,
    [
      check('title', 'El título es obligatorio').not().isEmpty(),
      check('description', 'La descripción es obligatoria').not().isEmpty(),
      check('status', 'El estado es obligatorio').isIn(['abierto', 'en_progreso', 'cerrado']),
      check('priority', 'La prioridad es obligatoria').isIn(['baja', 'media', 'alta']),
    ],
  ],
  validateRequest,
  ticketsController.updateTicket
);

// @route   DELETE api/tickets/:id
// @desc    Eliminar un ticket
// @access  Privado (solo admin)
router.delete('/:id', auth, ticketsController.deleteTicket);

module.exports = router;
