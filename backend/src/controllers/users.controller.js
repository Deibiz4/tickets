const User = require('../models/user.model');

// @desc    Obtener todos los usuarios
// @route   GET /api/users
// @access  Privado (Admin)
exports.getUsers = async (req, res, next) => {
    try {
        const departmentId = req.query.departmentId;

        let users;
        if (departmentId) {
            users = await User.getUsersByDepartment(parseInt(departmentId));
        } else {
            users = await User.getAllUsers();
        }

        res.json(users);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Error del servidor');
    }
};

// @desc    Obtener usuario por ID
// @route   GET /api/users/:id
// @access  Privado (Admin)
exports.getUserById = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ msg: 'Usuario no encontrado' });
        }
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Error del servidor');
    }
};

// @desc    Actualizar rol de usuario
// @route   PUT /api/users/:id/role
// @access  Privado (Admin)
exports.updateUserRole = async (req, res, next) => {
    try {
        const { role } = req.body;

        if (!role) {
            return res.status(400).json({ msg: 'El rol es obligatorio' });
        }

        const user = await User.updateUserRole(req.params.id, role);
        res.json(user);
    } catch (err) {
        console.error(err.message);
        if (err.message === 'Rol no válido') {
            return res.status(400).json({ msg: err.message });
        }
        if (err.message === 'Usuario no encontrado') {
            return res.status(404).json({ msg: err.message });
        }
        res.status(500).send('Error del servidor');
    }
};

// @desc    Crear nuevo usuario
// @route   POST /api/users
// @access  Privado (Admin)
exports.createUser = async (req, res, next) => {
    try {
        const { username, email, password, fullName, departmentId, phone, role } = req.body;

        if (!username || !email || !password || !fullName || !departmentId) {
            return res.status(400).json({ msg: 'Por favor ingrese todos los campos obligatorios' });
        }

        // Validate that department exists
        const Department = require('../models/department.model');
        const department = await Department.findById(departmentId);
        if (!department) {
            return res.status(400).json({ msg: 'El departamento seleccionado no existe' });
        }

        const user = await User.create({ username, email, password, fullName, departmentId, phone, role });
        res.json(user);
    } catch (err) {
        console.error(err.message);
        if (err.message === 'El correo electrónico ya está registrado') {
            return res.status(409).json({ msg: err.message });
        }
        res.status(500).send('Error del servidor');
    }
};

// @desc    Actualizar usuario completo
// @route   PUT /api/users/:id
// @access  Privado (Admin)
exports.updateUser = async (req, res, next) => {
    try {
        const user = await User.updateUser(req.params.id, req.body);
        res.json(user);
    } catch (err) {
        console.error(err.message);
        if (err.message === 'Rol no válido' || err.message === 'El nombre de usuario ya está en uso' || err.message === 'El correo electrónico ya está en uso') {
            return res.status(400).json({ msg: err.message });
        }
        if (err.message === 'Usuario no encontrado') {
            return res.status(404).json({ msg: err.message });
        }
        res.status(500).send('Error del servidor');
    }
};

// @desc    Eliminar usuario
// @route   DELETE /api/users/:id
// @access  Privado (Admin)
exports.deleteUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ msg: 'Usuario no encontrado' });
        }

        // Reasignar recursos al administrador que está ejecutando la acción
        const adminId = req.user.id;
        const targetId = req.params.id;

        // Usar poolPromise para queries directas
        const { poolPromise, sql } = require('../config/db');
        const pool = await poolPromise;

        // Reasignar Tickets creados
        await pool.request()
            .input('adminId', sql.Int, adminId)
            .input('targetId', sql.Int, targetId)
            .query('UPDATE tickets.tickets SET created_by = @adminId WHERE created_by = @targetId');

        // Reasignar Tickets asignados
        await pool.request()
            .input('adminId', sql.Int, adminId)
            .input('targetId', sql.Int, targetId)
            .query('UPDATE tickets.tickets SET assigned_to = @adminId WHERE assigned_to = @targetId');

        // Reasignar Comentarios
        await pool.request()
            .input('adminId', sql.Int, adminId)
            .input('targetId', sql.Int, targetId)
            .query('UPDATE tickets.comments SET user_id = @adminId WHERE user_id = @targetId');

        await User.delete(req.params.id);
        res.json({ msg: 'Usuario eliminado correctamente. Sus tickets y comentarios han sido reasignados a ti.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Error del servidor al eliminar usuario' });
    }
};
