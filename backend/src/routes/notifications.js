const express = require('express');
const router = express.Router();
const NotificationModel = require('../models/notification.model');
const { auth } = require('../middleware/auth');
const logger = require('../utils/logger');

// @route   GET /api/notifications/settings
// @desc    Obtener configuraciones de notificaciones
// @access  Admin
router.get('/settings', auth(['admin']), async (req, res) => {
    try {
        const settings = await NotificationModel.getSettings();
        res.json(settings);
    } catch (err) {
        logger.error(`Error fetching notification settings: ${err.message}`);
        res.status(500).send('Error del servidor');
    }
});

// @route   PUT /api/notifications/settings/:eventType
// @desc    Actualizar configuración de una notificación
// @access  Admin
router.put('/settings/:eventType', auth(['admin']), async (req, res) => {
    try {
        const { eventType } = req.params;
        const { enabled } = req.body;

        if (typeof enabled !== 'boolean') {
            return res.status(400).json({ msg: 'El valor enabled debe ser booleano' });
        }

        const updatedSetting = await NotificationModel.updateSetting(eventType, enabled);

        if (!updatedSetting) {
            return res.status(404).json({ msg: 'Configuración no encontrada' });
        }

        res.json(updatedSetting);
    } catch (err) {
        logger.error(`Error updating notification setting: ${err.message}`);
        res.status(500).send('Error del servidor');
    }
});

module.exports = router;
