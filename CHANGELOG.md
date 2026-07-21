# Registro de Cambios

Todos los cambios notables en este proyecto serán documentados en este archivo.

## [2.0.0] - 2026-02-17

### ⚠️ CAMBIOS IMPORTANTES (BREAKING CHANGES)

- **Sistema Multi-Departamental**: Transformación completa del sistema para soportar múltiples departamentos con aislamiento entre ellos
- **Migración de Base de Datos Requerida**: Es necesario ejecutar el script `migrations/001_multi_department_support.sql` antes de actualizar
- **Campo `users.department` deprecado**: Reemplazado por `users.department_id` (FK a tabla departments)
- **API modificada**: Los endpoints ahora filtran automáticamente por departamento según el rol del usuario

### Añadido

- **Super Administradores**: Nuevo campo `users.is_super_admin` que permite a ciertos administradores ver y gestionar tickets de TODOS los departamentos
- **Aislamiento por Departamento**: Los administradores regulares ahora solo ven tickets de su departamento
- **Selector de Departamento**: Al crear un ticket, los usuarios deben seleccionar a qué departamento va dirigido
- **Validación de Asignación**: Los tickets solo pueden asignarse a usuarios del mismo departamento
- **Notificaciones Segmentadas**: Las notificaciones de nuevos tickets solo se envían a administradores del departamento correspondiente
- **Filtro por Departamento Mejorado**: El filtro ahora usa IDs en lugar de nombres para mayor precisión
- **Scripts de Migración**:
  - `migrations/001_multi_department_support.sql` - Script principal de migración
  - `migrations/verify_migration.sql` - Script de verificación post-migración

### Modificado

- **Base de Datos**:
  - Nuevo campo `tickets.tickets.department_id` (INT NOT NULL, FK a departments.id)
  - Nuevo campo `users.is_super_admin` (BIT NOT NULL DEFAULT 0)
  - Nuevo campo `users.department_id` (INT NOT NULL, FK a departments.id)
  - Índices agregados: `IX_tickets_department_id`, `IX_users_department_id`

- **Backend - Modelos**:
  - `User.create()` ahora requiere `departmentId` en lugar de `department`
  - `User.findById()` incluye información del departamento y flag `is_super_admin`
  - `User.getAllUsers()` incluye JOINs con tabla departments
  - Nuevo método `User.getUsersByDepartment()` para filtrar usuarios por departamento
  - `Ticket.create()` ahora requiere `departmentId` (obligatorio)
  - `Ticket.find()` filtra automáticamente por departamento para admins no-super
  - `Department.findById()` agregado para validaciones

- **Backend - Controladores**:
  - `TicketsController.getTickets()`: Filtra automáticamente por departamento según rol
  - `TicketsController.getTicketById()`: Valida acceso por departamento
  - `TicketsController.createTicket()`: Requiere y valida `departmentId`
  - `TicketsController.updateTicket()`: Valida que asignación sea dentro del mismo departamento
  - `TicketsController.deleteTicket()`: Valida acceso por departamento
  - `UsersController.getUsers()`: Soporta filtro opcional `?departmentId=X`
  - `UsersController.createUser()`: Requiere y valida `departmentId`
  - `CommentsController.getComments()`: Valida acceso por departamento
  - `CommentsController.addComment()`: Valida acceso por departamento

- **Backend - Servicios**:
  - `EmailService.sendNewTicketNotification()`: Incluye nombre del departamento en emails

- **Frontend**:
  - `TicketForm.tsx`:
    - Selector de departamento obligatorio al crear tickets
    - Lista de usuarios para asignación filtrada por departamento del ticket
    - Muestra departamento del ticket (no del creador) al editar
  - `TicketList.tsx`:
    - Filtro de departamento usa IDs en lugar de nombres
    - Query param cambiado de `department` a `departmentId`

### Migración de Datos

- Todos los tickets existentes se asignan al departamento "IT" por defecto
- Todos los usuarios existentes se asignan a su departamento según `users.department` (campo legacy)
- El primer administrador se convierte automáticamente en super admin
- Departamentos se crean automáticamente basados en valores únicos de `users.department`

### Seguridad

- **Validación de acceso por departamento**: Los admins no pueden ver/editar tickets de otros departamentos (a menos que sean super admins)
- **Validación en asignaciones**: Solo se puede asignar a usuarios del mismo departamento del ticket
- **Validación en comentarios**: Solo usuarios con acceso al ticket pueden comentar

### Notas de Actualización

1. **Antes de actualizar**: Hacer backup completo de la base de datos
2. **Ejecutar migración**: `sqlcmd -S servidor -d TicketsDB -i migrations/001_multi_department_support.sql`
3. **Verificar migración**: `sqlcmd -S servidor -d TicketsDB -i migrations/verify_migration.sql`
4. **Actualizar código**: Desplegar nueva versión del backend y frontend
5. **Configurar super admins**: Si es necesario, actualizar más administradores con `UPDATE tickets.users SET is_super_admin = 1 WHERE id = X`

## [2026-01-27]

### Añadido
- **Asignación de Tickets**: Los administradores ahora pueden asignar tickets a usuarios o agentes específicos directamente desde el formulario de edición.
- **Notificaciones de Asignación**: Se envían notificaciones por correo electrónico a los usuarios cuando se les asigna un ticket.
- **Corrección del Build Frontend**: Se resolvieron dependencias circulares y exportaciones duplicadas en `ArticleDetail.tsx`.
- **Interfaz de Usuario**: Nuevo menú desplegable "Asignar a Usuario" en el formulario de tickets (visible solo para administradores).

### Corregido
- **Compatibilidad con Firefox**: Se corrigió un error de validación que impedía crear tickets en Firefox. El problema era causado por la cabecera HTTP `Priority` que entraba en conflicto con la validación del campo de prioridad del ticket.

## Funcionalidades de la Aplicación

### 🎫 Gestión de Tickets
- **Crear Tickets**: Los usuarios pueden crear tickets con título, descripción (Texto Enriquecido), nivel de prioridad y archivos adjuntos.
- **Vista Kanban/Lista**: Visualización de tickets por estado (Abierto, En Progreso, En Espera, Cerrado).
- **Detalles del Ticket**: Ver historial de conversación, actualizaciones de estado y adjuntos.
- **Comentarios**: Hilos de comentarios para la comunicación entre agentes y usuarios.

### 👥 Gestión de Usuarios (Admin)
- **Acceso Basado en Roles**: Soporte para roles de Administrador, Agente y Usuario.
- **Administración**: Crear, editar y eliminar usuarios.
- **Asignación de Tickets**: Asignar tickets a agentes/usuarios específicos para su resolución.

### 📚 Base de Conocimiento
- **Artículos**: Crear y gestionar artículos de ayuda para reducir el volumen de tickets.
- **Categorías**: Organizar artículos por tema (General, Sistemas, Software, etc.).
- **Búsqueda**: Búsqueda integrada para encontrar artículos rápidamente.
- **Sugerencias Contextuales**: Sugerencia automática de artículos relevantes durante la creación de tickets basada en el título.

### 🔔 Notificaciones
- **Alertas por Correo**: Correos automatizados para:
  - Creación de nuevo ticket (a administradores)
  - Actualizaciones de estado (al creador)
  - Asignación de ticket (al usuario asignado)
  - Nuevos comentarios (a las partes involucradas)

### 📊 Panel de Control y Estadísticas
- **Resumen**: Estadísticas rápidas sobre tickets abiertos, resueltos y pendientes.
- **Búsqueda Global**: Búsqueda a través de tickets y base de conocimiento.
