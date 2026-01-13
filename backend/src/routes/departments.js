const express = require('express');
const router = express.Router();
const departmentsController = require('../controllers/departments.controller');

// @route   GET /api/departments
// @desc    Obtener lista de departamentos
// @access  Publico (necesario para registro)
router.get('/', departmentsController.getDepartments);

module.exports = router;
