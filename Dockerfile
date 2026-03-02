FROM node:24.13.1-alpine

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm install

# Copier le code source
COPY ./public ./public
COPY ./server ./server
COPY generate-vapid-keys.js ./
COPY logger.js ./
COPY config.js ./
COPY server.js ./
COPY response-handler.js ./
COPY .env* ./

RUN mkdir -p /app/data/users && \
    mkdir -p /app/data && \
    chmod -R 777 /app/data

EXPOSE 3000

CMD ["npm", "start"]