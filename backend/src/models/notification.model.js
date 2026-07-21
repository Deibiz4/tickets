const { poolPromise, sql } = require('../config/db');

class NotificationModel {
    static async getSettings() {
        const pool = await poolPromise;
        const result = await pool.request()
            .query('SELECT * FROM tickets.notification_settings ORDER BY id ASC');
        return result.recordset;
    }

    static async updateSetting(eventType, enabled) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('enabled', sql.Bit, enabled) // MSSQL uses BIT for boolean
            .input('eventType', sql.VarChar, eventType)
            .query(`
        UPDATE tickets.notification_settings 
        SET enabled = @enabled, updated_at = SYSDATETIME() 
        OUTPUT Inserted.*
        WHERE event_type = @eventType
      `);
        return result.recordset[0];
    }

    static async isEnabled(eventType) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('eventType', sql.VarChar, eventType)
            .query('SELECT enabled FROM tickets.notification_settings WHERE event_type = @eventType');

        if (result.recordset.length === 0) return false;
        return result.recordset[0].enabled;
    }
}

module.exports = NotificationModel;
