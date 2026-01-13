# Jata Ticketing System

Sistema de gestión de tickets para Jata, construido con React, Node.js y PostgreSQL.

## Requisitos

- Node.js (v18+)
- Docker y Docker Compose

## Configuración

1.  Este proyecto utiliza Docker para la base de datos y el backend.
2.  El frontend corre localmente para desarrollo.

## Ejecución

1.  **Backend y Base de Datos**:
    ```bash
    docker-compose up -d
    ```

2.  **Frontend**:
    ```bash
    npm install
    npm run dev
    ```

3.  Acceder a `http://localhost:5173`.

## Funcionalidades

-   **Usuarios**: Login, Registro, Roles (Admin, Agente, Usuario).
-   **Tickets**: CRUD completo, estados, prioridades, asignación.
-   **Comentarios y Adjuntos**: Hilo de conversación con soporte para archivos.
-   **Notificaciones**: Emails automáticos (Mailtrap/SMTP).
-   **Panel**: Gráficos de estado y prioridades.
-   **Temas**: Diseño personalizado con colores corporativos Jata.

## Estructura

-   `/src`: Frontend (React + Vite + Tailwind).
-   `/backend`: API REST (Express + Postgres).
-   `init-db.sql`: Schema inicial de base de datos.
