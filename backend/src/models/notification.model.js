const { query } = require('../config/db');

class NotificationModel {
    static async getSettings() {
        const result = await query(
            'SELECT * FROM tickets.notification_settings ORDER BY id ASC'
        );
        return result.rows;
    }

    static async updateSetting(eventType, enabled) {
        const result = await query(
            `UPDATE tickets.notification_settings 
       SET enabled = $1, updated_at = NOW() 
       WHERE event_type = $2 
       RETURNING *`,
            [enabled, eventType]
        );
        return result.rows[0];
    }

    static async isEnabled(eventType) {
        const result = await query(
            'SELECT enabled FROM tickets.notification_settings WHERE event_type = $1',
            [eventType]
        );
        // If setting doesn't exist, default to true for safety, or false depending on preference.
        // Given the init script, it should exist.
        if (result.rows.length === 0) return false;
        return result.rows[0].enabled;
    }
}

module.exports = NotificationModel;
