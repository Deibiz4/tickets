const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['abierto', 'en_progreso', 'cerrado'],
    default: 'abierto'
  },
  priority: {
    type: String,
    enum: ['baja', 'media', 'alta'],
    default: 'media'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    text: {
      type: String,
      required: true,
      trim: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Índices para búsquedas frecuentes
ticketSchema.index({ title: 'text', description: 'text' });
ticketSchema.index({ status: 1 });
ticketSchema.index({ priority: 1 });
ticketSchema.index({ createdBy: 1 });
ticketSchema.index({ assignedTo: 1 });

// Método para formatear la respuesta
ticketSchema.methods.toJSON = function() {
  const ticket = this;
  const ticketObject = ticket.toObject();

  // Ocultar campos sensibles si es necesario
  delete ticketObject.__v;
  
  return ticketObject;
};

const Ticket = mongoose.model('Ticket', ticketSchema);

module.exports = Ticket;
