# Instrucciones de Instalación con Docker (Optimizado)

Este proyecto está configurado para ejecutarse de forma eficiente y segura usando Docker.

## Prerrequisitos
- Tener **Docker** y **Docker Compose** instalados.
  - [Descargar Docker Desktop](https://www.docker.com/products/docker-desktop/)

## Instalación y Despliegue
1. Abre una terminal dentro de la carpeta `tickets`.
2. Ejecuta el comando para construir e iniciar los servicios:
   ```bash
   docker-compose up -d --build
   ```
3. El sistema incluye **Healthchecks**. Puedes verificar el estado con:
   ```bash
   docker-compose ps
   ```
   (Espera a que el estado cambie de `starting` a `healthy`).

## Mejoras Implementadas
- **Multi-stage Builds**: Imágenes más ligeras y seguras.
- **Seguridad**: El backend se ejecuta con un usuario no root (`node`).
- **Rendimiento**: Configuración de Nginx con Gzip y cabeceras de seguridad.
- **Estabilidad**: Se han añadido límites de recursos (RAM/CPU) y políticas de reinicio automático.
- **Healthchecks**: El frontend ahora espera a que el backend esté listo antes de marcarse como saludable.

## Acceso
- **Frontend**: [http://localhost:5175](http://localhost:5175)
- **Backend API**: [http://localhost:3001](http://localhost:3001)

## Solución de Problemas
- Ver logs en tiempo real: `docker-compose logs -f`
- Reiniciar un servicio específico: `docker-compose restart backend`
- Detener y limpiar volúmenes: `docker-compose down -v`
