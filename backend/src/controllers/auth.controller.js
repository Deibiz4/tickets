const User = require('../models/user.model');
const { BadRequestError } = require('../middleware/errorHandler');
const { sendPasswordResetEmail } = require('../services/email.service');

const authController = {
  // Registrar un nuevo usuario
  async register(req, res, next) {
    try {
      const { username, email, password, fullName, department: departmentName, phone } = req.body;

      // Get department ID from name if needed, but User.create expects departmentId
      // For now, let's just find the department or default to null
      const Department = require('../models/department.model');
      const dept = await Department.findByName(departmentName);
      const departmentId = dept ? dept.id : null;

      // Crear el usuario
      const user = await User.create({
        username,
        email,
        password,
        fullName,
        departmentId,
        phone,
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
          department: user.department,
          phone: user.phone_number,
          role: user.role,
          isSuperAdmin: user.is_super_admin,
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
          isSuperAdmin: user.is_super_admin,
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
      res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.full_name,
          role: user.role,
          isSuperAdmin: user.is_super_admin,
          createdAt: user.created_at,
        }
      });
    } catch (error) {
      next(error);
    }
  },

  async forgotPassword(req, res, next) {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ msg: 'El correo es obligatorio' });

      const plainToken = await User.setResetToken(email);

      // Siempre responder igual para no revelar si el email existe
      if (plainToken) {
        const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${plainToken}`;
        await sendPasswordResetEmail(email, resetUrl);
      }

      res.json({ msg: 'Si el correo existe, recibirás un enlace para restablecer tu contraseña.' });
    } catch (error) {
      next(error);
    }
  },

  async resetPassword(req, res, next) {
    try {
      const { token, password } = req.body;
      if (!token || !password) return res.status(400).json({ msg: 'Token y contraseña son obligatorios' });
      if (password.length < 6) return res.status(400).json({ msg: 'La contraseña debe tener al menos 6 caracteres' });

      const ok = await User.resetPasswordByToken(token, password);
      if (!ok) return res.status(400).json({ msg: 'El enlace no es válido o ha expirado' });

      res.json({ msg: 'Contraseña actualizada correctamente' });
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
