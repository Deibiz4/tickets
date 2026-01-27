# Registro de Cambios

Todos los cambios notables en este proyecto serán documentados en este archivo.

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
