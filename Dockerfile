# Etapa de construcción
FROM node:18-alpine AS build
WORKDIR /app

# Copiar archivos de dependencias
# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm install

# ARG para variables de entorno de construcción
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Copiar el resto de los archivos
COPY . .

# Construir la aplicación
RUN npm run build

# Etapa de producción
FROM nginx:alpine

# Copiar la aplicación construida
COPY --from=build /app/dist /usr/share/nginx/html

# Copiar la configuración de nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Exponer el puerto 5175
EXPOSE 5175

# Iniciar nginx
CMD ["nginx", "-g", "daemon off;"]
