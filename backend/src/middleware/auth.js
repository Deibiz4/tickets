const jwt = require('jsonwebtoken');
const { UnauthorizedError, ForbiddenError } = require('./errorHandler');
const { JWT_SECRET } = require('../config/constants');

// Middleware para verificar el token JWT
const auth = (roles = []) => {
  return async (req, res, next) => {
    try {
      // Obtener el token del encabezado de autorización
      const authHeader = req.header('Authorization');

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedError('No hay token, autorización denegada');
      }

      const token = authHeader.replace('Bearer ', '');

      try {
        // Verificar el token
        const decoded = jwt.verify(token, JWT_SECRET);

        // Añadir el usuario decodificado al objeto de solicitud
        req.user = decoded.user;

        // Verificar roles si se especifican
        if (roles.length > 0 && !roles.includes(decoded.user.role)) {
          throw new ForbiddenError('No tienes permiso para acceder a este recurso');
        }

        next();
      } catch (err) {
        if (err.name === 'ForbiddenError' || err instanceof ForbiddenError) {
          throw err;
        }
        throw new UnauthorizedError('Token no válido');
      }
    } catch (error) {
      next(error);
    }
  };
};

// Middleware para verificar si el usuario es administrador
const adminAuth = auth(['admin']);

// Middleware para verificar si el usuario es agente o administrador
const agentAuth = auth(['admin', 'agent']);

module.exports = {
  auth,
  adminAuth,
  agentAuth,
};
