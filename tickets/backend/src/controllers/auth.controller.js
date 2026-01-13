const User = require('../models/user.model');
const { BadRequestError } = require('../middleware/errorHandler');

const authController = {
  // Registrar un nuevo usuario
  async register(req, res, next) {
    try {
      const { username, email, password, fullName } = req.body;

      // Validar campos requeridos
      if (!username || !email || !password || !fullName) {
        throw new BadRequestError('Todos los campos son obligatorios');
      }

      // Crear el usuario
      const user = await User.create({
        username,
        email,
        password,
        fullName,
      });

      // Generar token JWT
      const token = User.generateAuthToken(user);

      // Enviar respuesta
      res.status(201).json({
        success: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.full_name,
          role: user.role,
          createdAt: user.created_at,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  // Iniciar sesión
  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      // Validar campos requeridos
      if (!email || !password) {
        throw new BadRequestError('Correo electrónico y contraseña son obligatorios');
      }

      // Autenticar usuario
      const user = await User.authenticate(email, password);

      // Generar token JWT
      const token = User.generateAuthToken(user);

      // Enviar respuesta
      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.full_name,
          role: user.role,
          createdAt: user.created_at,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  // Obtener perfil del usuario actual
  async getProfile(req, res, next) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        throw new NotFoundError('Usuario no encontrado');
      }
      res.json({ success: true, user });
    } catch (error) {
      next(error);
    }
  },

  // Actualizar perfil del usuario
  async updateProfile(req, res, next) {
    try {
      const { fullName, email, currentPassword, newPassword } = req.body;
      
      // Validar que al menos se proporcione un campo para actualizar
      if (!fullName && !email && !currentPassword && !newPassword) {
        throw new BadRequestError('Al menos un campo es requerido para actualizar');
      }

      // Validar que si se proporciona nueva contraseña, también se proporcione la actual
      if ((newPassword && !currentPassword) || (!newPassword && currentPassword)) {
        throw new BadRequestError('Se requiere la contraseña actual para cambiarla');
      }

      const updatedUser = await User.updateProfile(req.user.id, {
        fullName,
        email,
        currentPassword,
        newPassword,
      });

      res.json({ success: true, user: updatedUser });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = authController;
