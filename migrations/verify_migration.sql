-- ============================================
-- SCRIPT DE VERIFICACIÓN: Migración Multi-Departamental
-- Fecha: 2026-02-17
-- Descripción: Verifica que la migración se ejecutó correctamente
-- ============================================

USE TicketsDB;
GO

PRINT '';
PRINT '========================================';
PRINT 'VERIFICACIÓN DE MIGRACIÓN';
PRINT '========================================';
PRINT '';

-- ============================================
-- 1. Verificar que no hay tickets sin departamento
-- ============================================
PRINT '1. Verificando tickets sin departamento...';

DECLARE @ticketsSinDept INT;
SELECT @ticketsSinDept = COUNT(*)
FROM tickets.tickets
WHERE department_id IS NULL;

IF @ticketsSinDept = 0
    PRINT '  ✓ CORRECTO: Todos los tickets tienen departamento asignado';
ELSE
BEGIN
    PRINT '  ✗ ERROR: Hay ' + CAST(@ticketsSinDept AS VARCHAR(10)) + ' tickets sin departamento';
    SELECT TOP 10 id, title, created_by, created_at
    FROM tickets.tickets
    WHERE department_id IS NULL;
END

PRINT '';

-- ============================================
-- 2. Verificar que no hay usuarios sin departamento
-- ============================================
PRINT '2. Verificando usuarios sin departamento...';

DECLARE @usersSinDept INT;
SELECT @usersSinDept = COUNT(*)
FROM tickets.users
WHERE department_id IS NULL;

IF @usersSinDept = 0
    PRINT '  ✓ CORRECTO: Todos los usuarios tienen departamento asignado';
ELSE
BEGIN
    PRINT '  ✗ ERROR: Hay ' + CAST(@usersSinDept AS VARCHAR(10)) + ' usuarios sin departamento';
    SELECT TOP 10 id, username, email, role
    FROM tickets.users
    WHERE department_id IS NULL;
END

PRINT '';

-- ============================================
-- 3. Verificar distribución de tickets por departamento
-- ============================================
PRINT '3. Distribución de tickets por departamento:';
PRINT '   -----------------------------------------';

SELECT
    d.name AS Departamento,
    COUNT(t.id) AS Total_Tickets,
    SUM(CASE WHEN t.status = 'open' THEN 1 ELSE 0 END) AS Abiertos,
    SUM(CASE WHEN t.status = 'in_progress' THEN 1 ELSE 0 END) AS En_Progreso,
    SUM(CASE WHEN t.status = 'closed' THEN 1 ELSE 0 END) AS Cerrados
FROM tickets.departments d
LEFT JOIN tickets.tickets t ON t.department_id = d.id
GROUP BY d.name
ORDER BY Total_Tickets DESC;

PRINT '';

-- ============================================
-- 4. Verificar distribución de usuarios por departamento y rol
-- ============================================
PRINT '4. Distribución de usuarios por departamento:';
PRINT '   -------------------------------------------';

SELECT
    d.name AS Departamento,
    COUNT(u.id) AS Total_Usuarios,
    SUM(CASE WHEN u.role = 'admin' THEN 1 ELSE 0 END) AS Admins,
    SUM(CASE WHEN u.role = 'agent' THEN 1 ELSE 0 END) AS Agents,
    SUM(CASE WHEN u.role = 'user' THEN 1 ELSE 0 END) AS Users,
    SUM(CASE WHEN u.is_super_admin = 1 THEN 1 ELSE 0 END) AS Super_Admins
FROM tickets.departments d
LEFT JOIN tickets.users u ON u.department_id = d.id
GROUP BY d.name
ORDER BY Total_Usuarios DESC;

PRINT '';

-- ============================================
-- 5. Verificar super admins
-- ============================================
PRINT '5. Verificando super administradores...';

DECLARE @superAdmins INT;
SELECT @superAdmins = COUNT(*)
FROM tickets.users
WHERE is_super_admin = 1;

IF @superAdmins >= 1
BEGIN
    PRINT '  ✓ CORRECTO: Hay ' + CAST(@superAdmins AS VARCHAR(10)) + ' super admin(s) configurado(s)';
    PRINT '';
    PRINT '   Lista de super admins:';
    PRINT '   ----------------------';

    SELECT
        id AS ID,
        username AS Usuario,
        email AS Email,
        full_name AS Nombre_Completo,
        role AS Rol,
        (SELECT name FROM tickets.departments WHERE id = u.department_id) AS Departamento
    FROM tickets.users u
    WHERE is_super_admin = 1
    ORDER BY id;
END
ELSE
BEGIN
    PRINT '  ⚠ ADVERTENCIA: No hay super admins configurados';
    PRINT '    Se recomienda configurar al menos un super admin manualmente:';
    PRINT '    UPDATE tickets.users SET is_super_admin = 1 WHERE id = <id_del_admin>;';
END

PRINT '';

-- ============================================
-- 6. Verificar Foreign Keys
-- ============================================
PRINT '6. Verificando Foreign Keys...';

IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_tickets_departments')
    PRINT '  ✓ FK_tickets_departments existe';
ELSE
    PRINT '  ✗ FK_tickets_departments NO existe';

IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_users_departments')
    PRINT '  ✓ FK_users_departments existe';
ELSE
    PRINT '  ✗ FK_users_departments NO existe';

PRINT '';

-- ============================================
-- 7. Verificar Índices
-- ============================================
PRINT '7. Verificando índices...';

IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_tickets_department_id')
    PRINT '  ✓ IX_tickets_department_id existe';
ELSE
    PRINT '  ✗ IX_tickets_department_id NO existe';

IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_users_department_id')
    PRINT '  ✓ IX_users_department_id existe';
ELSE
    PRINT '  ✗ IX_users_department_id NO existe';

PRINT '';

-- ============================================
-- 8. Verificar estructura de columnas
-- ============================================
PRINT '8. Verificando estructura de columnas...';

-- Verificar tickets.department_id
IF EXISTS (SELECT * FROM sys.columns
           WHERE object_id = OBJECT_ID(N'tickets.tickets')
           AND name = 'department_id'
           AND is_nullable = 0)
    PRINT '  ✓ tickets.department_id existe y es NOT NULL';
ELSE
    PRINT '  ✗ tickets.department_id no cumple requisitos';

-- Verificar users.department_id
IF EXISTS (SELECT * FROM sys.columns
           WHERE object_id = OBJECT_ID(N'tickets.users')
           AND name = 'department_id'
           AND is_nullable = 0)
    PRINT '  ✓ users.department_id existe y es NOT NULL';
ELSE
    PRINT '  ✗ users.department_id no cumple requisitos';

-- Verificar users.is_super_admin
IF EXISTS (SELECT * FROM sys.columns
           WHERE object_id = OBJECT_ID(N'tickets.users')
           AND name = 'is_super_admin'
           AND is_nullable = 0)
    PRINT '  ✓ users.is_super_admin existe y es NOT NULL';
ELSE
    PRINT '  ✗ users.is_super_admin no cumple requisitos';

PRINT '';

-- ============================================
-- RESUMEN FINAL
-- ============================================
PRINT '';
PRINT '========================================';
PRINT 'RESUMEN DE VERIFICACIÓN';
PRINT '========================================';

DECLARE @errores INT = 0;
DECLARE @advertencias INT = 0;

-- Contar errores
IF @ticketsSinDept > 0 SET @errores = @errores + 1;
IF @usersSinDept > 0 SET @errores = @errores + 1;
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_tickets_departments') SET @errores = @errores + 1;
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_users_departments') SET @errores = @errores + 1;
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_tickets_department_id') SET @errores = @errores + 1;
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_users_department_id') SET @errores = @errores + 1;

-- Contar advertencias
IF @superAdmins = 0 SET @advertencias = @advertencias + 1;

PRINT '';
IF @errores = 0 AND @advertencias = 0
BEGIN
    PRINT '  ✓✓✓ MIGRACIÓN EXITOSA ✓✓✓';
    PRINT '  Todos los checks pasaron correctamente';
    PRINT '  El sistema está listo para actualizar el código del backend y frontend';
END
ELSE IF @errores = 0
BEGIN
    PRINT '  ⚠ MIGRACIÓN COMPLETADA CON ADVERTENCIAS';
    PRINT '  Errores: 0';
    PRINT '  Advertencias: ' + CAST(@advertencias AS VARCHAR(10));
    PRINT '  Revise las advertencias antes de proceder';
END
ELSE
BEGIN
    PRINT '  ✗✗✗ MIGRACIÓN INCOMPLETA ✗✗✗';
    PRINT '  Errores: ' + CAST(@errores AS VARCHAR(10));
    PRINT '  Advertencias: ' + CAST(@advertencias AS VARCHAR(10));
    PRINT '  Por favor corrija los errores antes de continuar';
END

PRINT '';
PRINT 'Siguiente paso:';
PRINT '  Si la verificación es exitosa, actualizar el código backend y frontend';
PRINT '';
GO
