const express = require('express');
const router = express.Router();
const statsController = require('../controllers/stats.controller');
const { auth } = require('../middleware/auth');

// @route   GET /api/stats
// @desc    Obtener estadísticas del dashboard
// @access  Admin/Agent (ajustar según necesidad, por ahora Agents también pueden ver)
router.get('/', auth(['admin', 'agent']), statsController.getDashboardStats);

module.exports = router;
