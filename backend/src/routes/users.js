const express = require('express');
const router = express.Router();
const usersController = require('../controllers/users.controller');
const { auth } = require('../middleware/auth');

// Middleware para verificar si es admin
const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(401).json({ msg: 'No autorizado - Requiere rol de Administrador' });
    }
};

// @route   GET api/users
// @desc    Obtener todos los usuarios
// @access  Privado (Admin)
router.get('/', [auth(), isAdmin], usersController.getUsers);

// @route   GET api/users/:id
// @desc    Obtener usuario por ID
// @access  Privado (Admin)
router.get('/:id', [auth(), isAdmin], usersController.getUserById);

// @route   PUT api/users/:id/role
// @desc    Actualizar rol de usuario
// @access  Privado (Admin)
router.put('/:id/role', [auth(), isAdmin], usersController.updateUserRole);

// @route   POST api/users
// @desc    Crear un usuario
// @access  Privado (Admin)
router.post('/', [auth(), isAdmin], usersController.createUser);

// @route   PUT api/users/:id
// @desc    Actualizar un usuario
// @access  Privado (Admin)
router.put('/:id', [auth(), isAdmin], usersController.updateUser);

// @route   DELETE api/users/:id
// @desc    Eliminar un usuario
// @access  Privado (Admin)
router.delete('/:id', [auth(), isAdmin], usersController.deleteUser);

module.exports = router;
