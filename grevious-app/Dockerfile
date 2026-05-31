# ==========================================
# Étape 1 : Compilation de l'application Web
# ==========================================
FROM debian:stable-slim AS build-env

# Installation des prérequis système
RUN apt-get update && apt-get install -y curl git unzip xz-utils libglu1-mesa && apt-get clean

# Clonage du SDK Flutter (Version stable)
RUN git clone https://github.com/flutter/flutter.git -b stable /usr/local/flutter

# Ajout de Flutter au PATH
ENV PATH="/usr/local/flutter/bin:/usr/local/flutter/bin/cache/dart-sdk/bin:${PATH}"

# Activation du support Web et exécution d'un premier doctor pour valider
RUN flutter doctor

# Définition du dossier de travail
WORKDIR /app

# Copie du projet (en respectant votre structure src/)
COPY ./src .

# Récupération des dépendances et compilation pour le Web
RUN flutter pub get
RUN flutter build web --release

# ==========================================
# Étape 2 : Serveur de production léger
# ==========================================
FROM nginx:alpine

# Copie des fichiers compilés par Flutter dans le dossier public d'Nginx
COPY --from=build-env /app/build/web /usr/share/nginx/html

# Exposition du port par défaut d'Nginx
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]