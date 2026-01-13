# Instrucciones de Instalación con Docker

Este proyecto está configurado para ejecutarse fácilmente usando Docker. Sigue estos pasos para desplegarlo en cualquier equipo.

## Prerrequisitos
- Tener **Docker** y **Docker Compose** instalados en el equipo destino.
  - [Descargar Docker Desktop](https://www.docker.com/products/docker-desktop/)

## Instalación
1. Copia la carpeta `tickets` completa al equipo destino.
2. Abre una terminal (o PowerShell) dentro de la carpeta `tickets`.
3. Ejecuta el siguiente comando para construir e iniciar los contenedores:
   ```bash
   docker-compose up -d --build
   ```
4. Espera unos minutos a que termine la construcción y se inicien los servicios.

## Acceso
- **Frontend (Aplicación Web)**: [http://localhost:5175](http://localhost:5175)
- **Backend API**: [http://localhost:3001](http://localhost:3001) (Internamente accesible por el frontend)
- **Base de Datos**: Accesible desde el host en `localhost:5435`.

## Credenciales por Defecto
El sistema crea automáticamente un usuario administrador y categorías base.
- **Usuario Administrador**:
  - Email: `admin@tickets.com`
  - Password: `admin123`

## Solución de Problemas
- Si los puertos `5175`, `3001` o `5435` están ocupados en el equipo destino, puedes editarlos en el archivo `docker-compose.yml` (sección `ports`).
- Para ver los logs si algo falla: `docker-compose logs -f`
- Para detener el sistema: `docker-compose down`
