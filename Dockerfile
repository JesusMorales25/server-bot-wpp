# Imagen base oficial de Node.js 18
FROM node:18-bullseye-slim

# Variables de entorno
ENV NODE_ENV=production \
    PORT=3001 \
    npm_config_cache=/tmp/.npm

# Instalar certificados CA (para HTTPS)
RUN apt-get update && apt-get install -y \
    ca-certificates \
    --no-install-recommends \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Directorio de trabajo
WORKDIR /app/server

# Copiar solo los archivos de dependencias primero
COPY package*.json ./

# Instalar dependencias de producción
RUN npm ci --only=production --silent --no-audit --no-fund \
    && npm cache clean --force \
    && rm -rf /tmp/.npm

# Copiar el resto del código
COPY . .

# Exponer el puerto (opcional, Railway lo detecta por la variable PORT)
EXPOSE 3001

# Comando de inicio
CMD ["node", "whatsapp-baileys-server.js"]