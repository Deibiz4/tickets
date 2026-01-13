# Usar imagen base de Node.js
FROM node:18-alpine

# Establecer el directorio de trabajo
WORKDIR /app

# Copiar archivos de configuración
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto de los archivos
COPY . .

# Puerto expuesto (puerto interno del contenedor)
EXPOSE 3000

# Comando para iniciar la aplicación
CMD ["node", "src/index.js"]
