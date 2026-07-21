-- ============================================
-- MIGRACIÓN: Soporte Multi-Departamental
-- Fecha: 2026-02-17
-- Descripción: Agrega soporte para múltiples departamentos
--              con aislamiento completo entre ellos
-- ============================================

USE TicketsDB;
GO

PRINT 'Iniciando migración multi-departamental...';
GO

-- ============================================
-- Paso 1: Insertar departamento por defecto
-- ============================================
PRINT 'Paso 1: Creando departamento IT por defecto...';
GO

IF NOT EXISTS (SELECT 1 FROM tickets.departments WHERE name = 'IT')
BEGIN
    INSERT INTO tickets.departments (name) VALUES ('IT');
    PRINT '  ✓ Departamento IT creado';
END
ELSE
BEGIN
    PRINT '  - Departamento IT ya existe';
END
GO

-- ============================================
-- Paso 2: Agregar campo department_id a tickets
-- ============================================
PRINT 'Paso 2: Agregando campo department_id a tabla tickets...';
GO

IF NOT EXISTS (SELECT * FROM sys.columns
               WHERE object_id = OBJECT_ID(N'tickets.tickets')
               AND name = 'department_id')
BEGIN
    ALTER TABLE tickets.tickets
    ADD department_id INT NULL;
    PRINT '  ✓ Campo department_id agregado a tickets';
END
ELSE
BEGIN
    PRINT '  - Campo department_id ya existe en tickets';
END
GO

-- ============================================
-- Paso 3: Agregar campo is_super_admin a users
-- ============================================
PRINT 'Paso 3: Agregando campo is_super_admin a tabla users...';
GO

IF NOT EXISTS (SELECT * FROM sys.columns
               WHERE object_id = OBJECT_ID(N'tickets.users')
               AND name = 'is_super_admin')
BEGIN
    ALTER TABLE tickets.users
    ADD is_super_admin BIT NOT NULL DEFAULT 0;
    PRINT '  ✓ Campo is_super_admin agregado a users';
END
ELSE
BEGIN
    PRINT '  - Campo is_super_admin ya existe en users';
END
GO

-- ============================================
-- Paso 4: Agregar campo department_id a users
-- ============================================
PRINT 'Paso 4: Agregando campo department_id a tabla users...';
GO

IF NOT EXISTS (SELECT * FROM sys.columns
               WHERE object_id = OBJECT_ID(N'tickets.users')
               AND name = 'department_id')
BEGIN
    ALTER TABLE tickets.users
    ADD department_id INT NULL;
    PRINT '  ✓ Campo department_id agregado a users';
END
ELSE
BEGIN
    PRINT '  - Campo department_id ya existe en users';
END
GO

-- ============================================
-- Paso 5: Migrar datos existentes
-- ============================================
PRINT 'Paso 5: Migrando datos existentes...';
GO

-- Obtener el ID del departamento IT
DECLARE @itDeptId INT;
SELECT @itDeptId = id FROM tickets.departments WHERE name = 'IT';

PRINT '  ID del departamento IT: ' + CAST(@itDeptId AS VARCHAR(10));

-- 5.1: Crear departamentos para valores únicos que no existen
PRINT '  5.1: Creando departamentos faltantes basados en users.department...';

INSERT INTO tickets.departments (name)
SELECT DISTINCT department
FROM tickets.users
WHERE department IS NOT NULL
  AND department <> ''
  AND department NOT IN (SELECT name FROM tickets.departments);

DECLARE @newDepts INT = @@ROWCOUNT;
PRINT '    ✓ ' + CAST(@newDepts AS VARCHAR(10)) + ' departamentos nuevos creados';

-- 5.2: Actualizar department_id en users basado en el nombre
PRINT '  5.2: Actualizando department_id en tabla users...';

UPDATE u
SET u.department_id = d.id
FROM tickets.users u
INNER JOIN tickets.departments d ON u.department = d.name
WHERE u.department_id IS NULL
  AND u.department IS NOT NULL
  AND u.department <> '';

DECLARE @usersUpdated INT = @@ROWCOUNT;
PRINT '    ✓ ' + CAST(@usersUpdated AS VARCHAR(10)) + ' usuarios actualizados';

-- 5.3: Asignar departamento IT a usuarios sin departamento
PRINT '  5.3: Asignando departamento IT a usuarios sin departamento...';

UPDATE tickets.users
SET department_id = @itDeptId
WHERE department_id IS NULL;

DECLARE @usersWithoutDept INT = @@ROWCOUNT;
PRINT '    ✓ ' + CAST(@usersWithoutDept AS VARCHAR(10)) + ' usuarios asignados a IT';

-- 5.4: Asignar todos los tickets existentes al departamento IT
PRINT '  5.4: Asignando tickets existentes al departamento IT...';

UPDATE tickets.tickets
SET department_id = @itDeptId
WHERE department_id IS NULL;

DECLARE @ticketsUpdated INT = @@ROWCOUNT;
PRINT '    ✓ ' + CAST(@ticketsUpdated AS VARCHAR(10)) + ' tickets asignados a IT';

-- 5.5: Convertir primer admin en super admin
PRINT '  5.5: Configurando primer admin como super admin...';

UPDATE TOP(1) tickets.users
SET is_super_admin = 1
WHERE role = 'admin'
  AND is_super_admin = 0
ORDER BY id ASC;

IF @@ROWCOUNT > 0
    PRINT '    ✓ Super admin configurado';
ELSE
    PRINT '    - Ya existe un super admin o no hay admins';

GO

-- ============================================
-- Paso 6: Hacer los campos NOT NULL
-- ============================================
PRINT 'Paso 6: Convirtiendo campos a NOT NULL...';
GO

-- Verificar que no haya valores NULL antes de hacer NOT NULL
DECLARE @nullTickets INT;
DECLARE @nullUsers INT;

SELECT @nullTickets = COUNT(*) FROM tickets.tickets WHERE department_id IS NULL;
SELECT @nullUsers = COUNT(*) FROM tickets.users WHERE department_id IS NULL;

IF @nullTickets > 0
BEGIN
    PRINT '  ERROR: Hay ' + CAST(@nullTickets AS VARCHAR(10)) + ' tickets sin department_id';
    PRINT '  Abortando migración. Por favor revise los datos.';
    RAISERROR('Migración abortada: tickets con department_id NULL', 16, 1);
END

IF @nullUsers > 0
BEGIN
    PRINT '  ERROR: Hay ' + CAST(@nullUsers AS VARCHAR(10)) + ' usuarios sin department_id';
    PRINT '  Abortando migración. Por favor revise los datos.';
    RAISERROR('Migración abortada: usuarios con department_id NULL', 16, 1);
END

-- Si llegamos aquí, podemos hacer los campos NOT NULL
ALTER TABLE tickets.tickets
ALTER COLUMN department_id INT NOT NULL;
PRINT '  ✓ Campo tickets.department_id ahora es NOT NULL';

ALTER TABLE tickets.users
ALTER COLUMN department_id INT NOT NULL;
PRINT '  ✓ Campo users.department_id ahora es NOT NULL';

GO

-- ============================================
-- Paso 7: Crear Foreign Keys
-- ============================================
PRINT 'Paso 7: Creando Foreign Keys...';
GO

-- FK para tickets.department_id
IF NOT EXISTS (SELECT * FROM sys.foreign_keys
               WHERE name = 'FK_tickets_departments')
BEGIN
    ALTER TABLE tickets.tickets
    ADD CONSTRAINT FK_tickets_departments
    FOREIGN KEY (department_id) REFERENCES tickets.departments(id);
    PRINT '  ✓ FK_tickets_departments creada';
END
ELSE
BEGIN
    PRINT '  - FK_tickets_departments ya existe';
END
GO

-- FK para users.department_id
IF NOT EXISTS (SELECT * FROM sys.foreign_keys
               WHERE name = 'FK_users_departments')
BEGIN
    ALTER TABLE tickets.users
    ADD CONSTRAINT FK_users_departments
    FOREIGN KEY (department_id) REFERENCES tickets.departments(id);
    PRINT '  ✓ FK_users_departments creada';
END
ELSE
BEGIN
    PRINT '  - FK_users_departments ya existe';
END
GO

-- ============================================
-- Paso 8: Crear índices para performance
-- ============================================
PRINT 'Paso 8: Creando índices...';
GO

-- Índice en tickets.department_id
IF NOT EXISTS (SELECT * FROM sys.indexes
               WHERE name = 'IX_tickets_department_id'
               AND object_id = OBJECT_ID('tickets.tickets'))
BEGIN
    CREATE INDEX IX_tickets_department_id
    ON tickets.tickets(department_id);
    PRINT '  ✓ Índice IX_tickets_department_id creado';
END
ELSE
BEGIN
    PRINT '  - Índice IX_tickets_department_id ya existe';
END
GO

-- Índice en users.department_id
IF NOT EXISTS (SELECT * FROM sys.indexes
               WHERE name = 'IX_users_department_id'
               AND object_id = OBJECT_ID('tickets.users'))
BEGIN
    CREATE INDEX IX_users_department_id
    ON tickets.users(department_id);
    PRINT '  ✓ Índice IX_users_department_id creado';
END
ELSE
BEGIN
    PRINT '  - Índice IX_users_department_id ya existe';
END
GO

-- ============================================
-- MIGRACIÓN COMPLETADA
-- ============================================
PRINT '';
PRINT '========================================';
PRINT 'MIGRACIÓN COMPLETADA EXITOSAMENTE';
PRINT '========================================';
PRINT '';
PRINT 'Resumen de cambios:';
PRINT '  - Campos agregados a tickets.tickets: department_id (INT NOT NULL)';
PRINT '  - Campos agregados a tickets.users: department_id (INT NOT NULL), is_super_admin (BIT)';
PRINT '  - Foreign Keys creadas: FK_tickets_departments, FK_users_departments';
PRINT '  - Índices creados: IX_tickets_department_id, IX_users_department_id';
PRINT '';
PRINT 'Siguiente paso:';
PRINT '  Ejecutar: sqlcmd -S servidor -d TicketsDB -i migrations/verify_migration.sql';
PRINT '';
GO
