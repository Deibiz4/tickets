const express = require('express');
const { check } = require('express-validator');
const ticketsController = require('../controllers/tickets.controller');
const { validateRequest } = require('../middleware/validateRequest');
const { auth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const commentsController = require('../controllers/comments.controller');

const router = express.Router();

// @route   GET api/tickets
// @desc    Obtener todos los tickets
// @access  Privado
router.get('/', auth(), ticketsController.getTickets);

// @route   GET api/tickets/:id
// @desc    Obtener un ticket por ID
// @access  Privado
router.get('/:id', auth(), ticketsController.getTicketById);

// @route   POST api/tickets
// @desc    Crear un nuevo ticket
// @access  Privado
router.post(
  '/',
  [
    auth(),
    upload.single('file'), // Permitir subida de archivos
    [
      check('title', 'El título es obligatorio').not().isEmpty(),
      check('description', 'La descripción es obligatoria').not().isEmpty(),
      check('priority', 'La prioridad es obligatoria').isIn(['low', 'medium', 'high', 'critical']),
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
    auth(),
    [
      check('status', 'Estado inválido').optional().isIn(['open', 'in_progress', 'waiting', 'closed']),
      check('priority', 'Prioridad inválida').optional().isIn(['low', 'medium', 'high', 'critical']),
    ],
  ],
  validateRequest,
  ticketsController.updateTicket
);

// @route   DELETE api/tickets/:id
// @desc    Eliminar un ticket
// @access  Privado (solo admin)
router.delete('/:id', auth(), ticketsController.deleteTicket);

// @route   GET api/tickets/:id/comments
// @desc    Obtener comentarios del ticket
// @access  Privado
router.get('/:id/comments', auth(), commentsController.getComments);

// @route   POST api/tickets/:id/comments
// @desc    Agregar comentario (y archivo)
// @access  Privado
router.post(
  '/:id/comments',
  [auth(), upload.single('file')],
  commentsController.addComment
);

module.exports = router;
