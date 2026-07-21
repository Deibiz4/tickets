const User = require('../models/user.model');
const { NotFoundError, BadRequestError } = require('../middleware/errorHandler');

/**
 * @desc    Obtener todos los usuarios (para gestión administrativa)
 * @route   GET /api/admin/users
 * @access  Super Admin
 */
exports.getAllUsers = async (req, res, next) => {
    try {
        const users = await User.getAllUsers();
        res.json(users);
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Actualizar un usuario
 * @route   PUT /api/admin/users/:id
 * @access  Super Admin
 */
exports.updateUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        const body = req.body;

        const updatedUser = await User.updateUser(id, body);

        if (!updatedUser) {
            throw new NotFoundError('Usuario no encontrado');
        }

        res.json({
            success: true,
            user: updatedUser
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Eliminar un usuario (con reasignación manejada por el controlador de usuarios estándar si es necesario, 
 *          pero aquí proveemos una vía directa admin)
 * @route   DELETE /api/admin/users/:id
 * @access  Super Admin
 */
exports.deleteUser = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Evitar auto-eliminación
        if (id == req.user.id) {
            throw new BadRequestError('No puedes eliminar tu propia cuenta de administrador');
        }

        const deleted = await User.delete(id);
        if (!deleted) {
            throw new NotFoundError('Usuario no encontrado');
        }

        res.json({
            success: true,
            msg: 'Usuario eliminado correctamente'
        });
    } catch (error) {
        next(error);
    }
};
