const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { auth } = require('../middleware/auth');

/**
 * Middleware personalizado para verificar específicamente is_super_admin
 */
const superAdminAuth = async (req, res, next) => {
    const User = require('../models/user.model');
    try {
        const user = await User.findById(req.user.id);
        if (user && user.is_super_admin) {
            return next();
        }
        return res.status(403).json({ msg: 'Acceso denegado: Se requieren privilegios de súper-administrador' });
    } catch (error) {
        next(error);
    }
};

// Todas las rutas de administración requieren estar autenticado y ser súper-admin
router.use(auth());
router.use(superAdminAuth);

// Rutas de gestión de usuarios
router.get('/users', adminController.getAllUsers);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);

module.exports = router;
