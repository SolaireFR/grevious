FROM node:20-alpine

WORKDIR /app

# Copie d'abord les fichiers de dépendances pour profiter du cache Docker
COPY package.json package-lock.json* ./
RUN npm install --frozen-lockfile || npm install

# Copie le reste du code (plus rapide si peu de changements)
COPY . .

ENV EXPO_DEVTOOLS_LISTEN_ADDRESS=0.0.0.0

EXPOSE 19006 8081

CMD ["sh", "-c", "node generate-env.js && npm run web -- --host lan --port 19006"]

