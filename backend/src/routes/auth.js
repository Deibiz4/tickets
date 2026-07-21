const express = require('express');
const { check } = require('express-validator');
const authController = require('../controllers/auth.controller');
const { validateRequest } = require('../middleware/validateRequest');
const { auth } = require('../middleware/auth');

const router = express.Router();

// @route   POST api/auth/register
// @desc    Registrar un nuevo usuario
// @access  Público
router.post(
  '/register',
  [
    check('username', 'El nombre de usuario es obligatorio').not().isEmpty(),
    check('email', 'Por favor incluye un email válido').isEmail(),
    check('password', 'Por favor ingresa una contraseña con 6 o más caracteres').isLength({ min: 6 }),
    check('fullName', 'El nombre completo es obligatorio').not().isEmpty(),
    check('department', 'El departamento es obligatorio').not().isEmpty(),
  ],
  validateRequest,
  authController.register
);

// @route   POST api/auth/login
// @desc    Iniciar sesión y obtener token
// @access  Público
router.post(
  '/login',
  [
    check('email', 'Por favor incluye un email válido').isEmail(),
    check('password', 'La contraseña es requerida').exists(),
  ],
  validateRequest,
  authController.login
);

// @route   GET api/auth/me
// @desc    Obtener perfil del usuario actual
// @access  Privado
router.get('/me', auth(), authController.getProfile);

// @route   PUT api/auth/me
// @desc    Actualizar perfil del usuario actual
// @access  Privado
router.put(
  '/me',
  auth(),
  [
    check('email', 'Por favor incluye un email válido').optional().isEmail(),
    check('fullName', 'El nombre completo no puede estar vacío').optional().not().isEmpty(),
    check('currentPassword', 'La contraseña actual es requerida para cambiar la contraseña')
      .if((value, { req }) => req.body.newPassword)
      .notEmpty(),
    check('newPassword', 'La nueva contraseña debe tener al menos 6 caracteres')
      .if((value, { req }) => req.body.currentPassword)
      .isLength({ min: 6 }),
  ],
  validateRequest,
  authController.updateProfile
);



// @route   POST api/auth/forgot-password
// @access  Público
router.post(
  '/forgot-password',
  [check('email', 'Por favor incluye un email válido').isEmail()],
  validateRequest,
  authController.forgotPassword
);

// @route   POST api/auth/reset-password
// @access  Público
router.post(
  '/reset-password',
  [
    check('token', 'El token es obligatorio').not().isEmpty(),
    check('password', 'La contraseña debe tener al menos 6 caracteres').isLength({ min: 6 }),
  ],
  validateRequest,
  authController.resetPassword
);

module.exports = router;
