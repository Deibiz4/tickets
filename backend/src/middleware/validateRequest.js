const { validationResult } = require('express-validator');
const { BadRequestError } = require('./errorHandler');

// Middleware para validar los resultados de express-validator
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    // Mapear los errores a un formato más manejable
    const errorMessages = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
    }));

    throw new BadRequestError('Error de validación', errorMessages);
  }

  next();
};

module.exports = {
  validateRequest,
};
