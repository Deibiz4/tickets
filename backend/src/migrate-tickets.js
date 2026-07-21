const fs = require('fs');
const path = require('path');
const { poolPromise, sql } = require('./config/db');

async function migrate() {
    console.log('--- Iniciando migración de tickets ---');
    const pool = await poolPromise;

    // 1. Obtener usuarios y departamentos actuales para mapeo
    const usersResult = await pool.request().query('SELECT id, username, department_id FROM tickets.users');
    const users = usersResult.recordset;
    const userMap = {};
    users.forEach(u => {
        userMap[u.username.toLowerCase()] = { id: u.id, dept: u.department_id };
    });

    // Usuarios del backup (para mapear IDs antiguos a nombres)
    // El backup tiene: ID, username, email...
    // Necesitamos extraer esto de backup_tickets.sql línea por línea o tener un mapa manual si son pocos.
    // Vamos a intentar mapear por ID si coinciden, si no por nombre.
    
    // 2. Leer datos extraídos de tickets
    const dataFile = path.join(__dirname, 'tickets_data.txt');
    if (!fs.existsSync(dataFile)) {
        console.error('No se encuentra el archivo tickets_data.txt');
        process.exit(1);
    }

    const lines = fs.readFileSync(dataFile, 'utf8').split('\n').filter(l => l.trim());
    console.log(`Procesando ${lines.length} tickets del backup...`);

    // 3. Obtener IDs de tickets actuales
    const existingResult = await pool.request().query('SELECT id FROM tickets.tickets');
    const existingIds = new Set(existingResult.recordset.map(r => r.id));

    let migrated = 0;
    let errors = 0;
    let repeated = 0;

    for (const line of lines) {
        const parts = line.split('\t');
        if (parts.length < 10) continue;

        let id = parseInt(parts[0]);
        const title = parts[1];
        const description = parts[2] || '';
        const status = parts[3];
        const priority = parts[4];
        const createdByIdOld = parts[5];
        const assignedToIdOld = parts[6] !== '\\N' ? parts[6] : null;
        const createdAt = parts[7];
        const updatedAt = parts[8];
        const closedAt = parts[9] !== '\\N' ? parts[9] : null;
        const resolutionSummary = parts[10] !== '\\N' ? parts[10] : '';
        const resolutionActions = parts[11] !== '\\N' ? parts[11] : '';

        // El mayor problema es el created_by (ID). 
        // Como no tenemos el mapa exacto de IDs viejos -> nuevos, 
        // usaremos un usuario admin por defecto si el ID no existe o mapearemos los principales.
        // Asumimos que el ID 6 es el admin principal o similar.
        
        let targetId = id;
        if (existingIds.has(id)) {
            repeated++;
            // Buscar nuevo ID (max + 1)
            const maxIdResult = await pool.request().query('SELECT MAX(id) as maxId FROM tickets.tickets');
            targetId = (maxIdResult.recordset[0].maxId || id) + 1;
            console.log(`ID ${id} duplicado. Usando nuevo ID: ${targetId} para "${title}"`);
        }

        // Mapeo básico de usuarios (estimado por IDs comunes o fallback)
        // Intentaremos usar el ID original, si falla por FK, usaremos el usuario que ejecuta (admin)
        const creatorId = 14; // Un ID de usuario que sepamos que existe (Alberto Lorente es 14)
        const deptId = 7; // IT por defecto si no se encuentra

        try {
            await pool.request()
                .input('id', sql.Int, targetId)
                .input('title', sql.VarChar, title)
                .input('description', sql.NVarChar, description)
                .input('status', sql.VarChar, status)
                .input('priority', sql.VarChar, priority)
                .input('created_by', sql.Int, creatorId)
                .input('department_id', sql.Int, deptId)
                .input('created_at', sql.DateTime2, createdAt)
                .input('updated_at', sql.DateTime2, updatedAt)
                .input('closed_at', sql.DateTime2, closedAt)
                .input('resolution_summary', sql.NVarChar, resolutionSummary)
                .input('resolution_actions', sql.NVarChar, resolutionActions)
                .query(`
                    SET IDENTITY_INSERT tickets.tickets ON;
                    INSERT INTO tickets.tickets 
                    (id, title, description, status, priority, created_by, department_id, created_at, updated_at, closed_at, resolution_summary, resolution_actions)
                    VALUES (@id, @title, @description, @status, @priority, @created_by, @department_id, @created_at, @updated_at, @closed_at, @resolution_summary, @resolution_actions);
                    SET IDENTITY_INSERT tickets.tickets OFF;
                `);
            migrated++;
            existingIds.add(targetId);
        } catch (err) {
            console.error(`Error migrando ticket ${id} ("${title}"):`, err.message);
            errors++;
        }
    }

    console.log('--- Migración finalizada ---');
    console.log(`Tickets migrados: ${migrated}`);
    console.log(`IDs repetidos y reasignados: ${repeated}`);
    console.log(`Errores: ${errors}`);
    
    process.exit(0);
}

migrate();
