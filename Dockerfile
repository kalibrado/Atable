FROM node:18-alpine

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances en mode production
RUN npm install

# Copier le code source
COPY ./public ./public
COPY ./server ./server
COPY generate-vapid-keys.js ./
COPY logger.js ./
COPY config.js ./
COPY server.js ./
COPY response-handler.js ./

RUN mkdir -p /app/data/users && \
    mkdir -p /app/data && \
    chmod -R 777 /app/data

# Exposer le port (à adapter selon votre app)
EXPOSE 3000

RUN node generate-vapid-keys.js

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})" || exit 1

# Démarrer l'application
CMD ["node", "server.js"]
