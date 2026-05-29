FROM node:20-alpine

WORKDIR /app

# Copie d'abord les fichiers de dépendances pour profiter du cache Docker
COPY package.json package-lock.json* ./
RUN npm install --frozen-lockfile || npm install

# Copie le reste du code (plus rapide si peu de changements)
COPY . .

EXPOSE 3000

CMD ["npm", "start"]
