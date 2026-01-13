const { StatusCodes } = require('http-status-codes');

const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  const statusCode = err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
  const message = err.message || 'Algo salió mal en el servidor';

  res.status(statusCode).json({
    success: false,
    message,
    errors: err.errors, // Incluir detalles de validación si existen
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

class BadRequestError extends ApiError {
  constructor(message = 'Solicitud incorrecta', errors = []) {
    super(StatusCodes.BAD_REQUEST, message);
    this.errors = errors;
  }
}

class UnauthorizedError extends ApiError {
  constructor(message = 'No autorizado') {
    super(StatusCodes.UNAUTHORIZED, message);
  }
}

class ForbiddenError extends ApiError {
  constructor(message = 'Prohibido') {
    super(StatusCodes.FORBIDDEN, message);
  }
}

class NotFoundError extends ApiError {
  constructor(message = 'Recurso no encontrado') {
    super(StatusCodes.NOT_FOUND, message);
  }
}

class ConflictError extends ApiError {
  constructor(message = 'Conflicto') {
    super(StatusCodes.CONFLICT, message);
  }
}

module.exports = {
  errorHandler,
  ApiError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
};
