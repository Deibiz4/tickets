require('dotenv').config();
const { poolPromise } = require('./config/db');
const reportService = require('./services/report.service');
const logger = require('./utils/logger');

const runTestReports = async () => {
    try {
        console.log('--- Iniciando prueba de reportes ---');
        
        // Esperar conexión a DB
        await poolPromise;
        console.log('DB conectada.');

        console.log('Enviando reporte diario de prueba a tic02@jata.es...');
        await reportService.sendDailyOpenTicketsReport('tic02@jata.es');
        
        console.log('Enviando resumen semanal de prueba a tic02@jata.es...');
        await reportService.sendWeeklySummaryReport('tic02@jata.es');

        console.log('--- Pruebas finalizadas con éxito ---');
        process.exit(0);
    } catch (error) {
        console.error('Error en la prueba:', error);
        process.exit(1);
    }
};

runTestReports();
