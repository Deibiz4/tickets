# Stage 2: Production
FROM node:18-alpine

WORKDIR /app

# Install only production dependencies
COPY package*.json ./
RUN npm install --only=production && \
    mkdir -p logs uploads && \
    chown -R node:node /app

# Copy source code
COPY src ./src

# Ensure source code also belongs to 'node'
RUN chown -R node:node /app/src

# Set environment to production
ENV NODE_ENV=production

# Use non-root user
USER node

EXPOSE 3000

CMD ["node", "src/index.js"]
