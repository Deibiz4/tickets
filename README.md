# 🎫 Sistema de Gestión de Tickets e Incidencias

Una plataforma integral para la gestión de soporte técnico, incidencias y base de conocimiento. Diseñada para optimizar el flujo de trabajo entre departamentos, permitiendo un seguimiento eficiente de tareas y ofreciendo soluciones rápidas a través de una base de conocimientos integrada.

![Estado](https://img.shields.io/badge/Estado-En_Desarrollo-green)
![Licencia](https://img.shields.io/badge/Licencia-MIT-blue)

## 📖 Sobre el Proyecto

Este sistema nació de la necesidad de centralizar y organizar las solicitudes de soporte interno. Permite a los usuarios reportar problemas en diferentes categorías (Sistemas, Mantenimiento, Calidad, etc.), y a los agentes/administradores gestionarlos, asignarlos y resolverlos de manera eficiente.

### ¿Cómo está hecho? (Arquitectura)

La plataforma utiliza una arquitectura moderna basada en contenedores para facilitar su despliegue y escalabilidad.

#### **Frontend (La Interfaz)**
-   **Framework**: [React](https://react.dev/) + [Vite](https://vitejs.dev/) para una experiencia de usuario ultra rápida.
-   **Lenguaje**: TypeScript para un código robusto y libre de errores.
-   **Estilos**: [Tailwind CSS](https://tailwindcss.com/) para el diseño y **Shadcn/ui** para componentes visuales elegantes y accesibles.
-   **Gráficos**: Recharts para visualizar métricas de rendimiento.

#### **Backend (El Cerebro)**
-   **Servidor**: [Node.js](https://nodejs.org/) con [Express](https://expressjs.com/).
-   **Base de Datos**: [PostgreSQL](https://www.postgresql.org/), una base de datos relacional potente y segura.
-   **Autenticación**: JWT (JSON Web Tokens) y bcrypt para seguridad de contraseñas.
-   **Emails**: Nodemailer para notificaciones automáticas.

#### **Infraestructura**
-   **Docker**: Todo el sistema está "dockerizado" (Backend + Base de Datos) para que funcione igual en cualquier máquina.

---

## ✨ Funcionalidades Principales

### 1. 🎫 Gestión de Tickets
-   **Ciclo de Vida Completo**: Creación, Asignación, Progreso, Cierre.
-   **Priorización Visual**: Etiquetas de prioridad (Baja, Media, Alta, Crítica) y Estado.
-   **Sistema de Comentarios**: Chat interno en cada ticket para agilizar la resolución.
-   **Adjuntos**: Soporte para subir capturas de pantalla o documentos.

### 2. 📚 Base de Conocimiento (Knowledge Base)
-   **Artículos de Ayuda**: Guías y tutoriales para que los usuarios resuelvan problemas comunes por sí mismos.
-   **Categorización**: Organización por temas (Software, Redes, Impresoras).
-   **Buscador**: Encuentra soluciones rápidamente.

### 3. 👥 Roles y Permisos Avanzados
-   **Admin**: Control total, gestión de usuarios, departamentos y ajustes globales.
-   **Agente**: Gestiona tickets asignados, responde y resuelve incidencias.
-   **Usuario**: Crea tickets, consulta sus estados y accede a la base de conocimiento.

### 4. 📊 Dashboard de Métricas
-   Resumen visual del estado del sistema.
-   Contadores de tickets abiertos, cerrados y pendientes.
-   Gráficos de distribución por prioridad y estado.

### 5. 🔔 Notificaciones
-   Avisos automáticos por correo electrónico cuando:
    -   Se crea un ticket nuevo.
    -   Se añade un comentario.
    -   Un ticket cambia de estado.

---

## 🚀 Guía de Instalación y Despliegue

Si quieres probar este proyecto en tu propia máquina, sigue estos pasos:

### Requisitos Previos
-   [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado y corriendo.
-   [Node.js](https://nodejs.org/) (opcional, si quieres correr el frontend sin Docker inicialmente).

### Pasos

1.  **Clonar el repositorio**
    ```bash
    git clone https://github.com/Deibiz4/tickets.git
    cd tickets
    ```

2.  **Configurar Variables de Entorno**
    Crea un archivo en `backend/.env` con tu configuración (usuario de DB, clave secreta JWT, credenciales de correo).

3.  **Iniciar el Sistema (Backend + BD)**
    En la raíz del proyecto:
    ```bash
    docker-compose up -d
    ```
    *Esto levantará la base de datos PostgreSQL y el servidor Backend.*

4.  **Iniciar el Frontend**
    ```bash
    npm install
    npm run dev
    ```
    *El frontend estará disponible en `http://localhost:5173`*

---

## 📂 Estructura del Repositorio

```
/
├── backend/            # Código fuente del servidor (Node.js)
│   ├── src/            # Controladores, Modelos, Rutas
│   ├── init-db.sql     # Script de inicio de la Base de Datos
│   └── Dockerfile      # Configuración de imagen Docker del backend
├── src/                # Código fuente del cliente (React)
│   ├── components/     # Componentes reutilizables (Botones, Tablas...)
│   ├── pages/          # Páginas principales (Dashboard, Login...)
│   └── services/       # Conexión con la API
├── docker-compose.yml  # Orquestación de contenedores
└── README.md           # Esta guía
```

---
