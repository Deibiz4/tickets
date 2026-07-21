# Stage 1: Build
FROM node:18-alpine AS build

WORKDIR /app

# Copy dependency files first for better layer caching
COPY package*.json ./

# Install dependencies using npm install to handle out-of-sync lock files
RUN npm install

# ARG for build-time environment variables
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Copy the rest of the application
COPY . .

# Build the application
RUN npm run build

# Stage 2: Production
FROM nginx:alpine

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy built app from the build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy the optimized nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose the frontend port
EXPOSE 5175

# Use a non-root user for security (optional but recommended)
# Note: nginx:alpine doesn't easily support running as non-root on port < 1024
# without extra config, so we'll stick to default for now.

CMD ["nginx", "-g", "daemon off;"]
