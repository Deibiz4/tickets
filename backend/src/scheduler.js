const cron = require('node-cron');
const reportService = require('./services/report.service');
const logger = require('./utils/logger');

const initSchedulers = () => {
    logger.info('Initializing schedulers...');

    // Correo diario de tickets abiertos (Lunes a Jueves a las 08:00)
    // Se ha deshabilitado el envío para viernes, sábado y domingo.
    cron.schedule('0 8 * * 1-4', () => {
        logger.info('Running daily open tickets report job');
        reportService.sendDailyOpenTicketsReport('tic02@jata.es');
    });

    // Correo semanal los viernes a las 13:45
    cron.schedule('45 13 * * 5', () => {
        logger.info('Running weekly summary report job');
        reportService.sendWeeklySummaryReport('tic02@jata.es');
    });

    logger.info('Schedulers initialized successfully');
};

module.exports = { initSchedulers };
