@echo off
SETLOCAL

:: Vérifie si le conteneur tourne, sinon le démarre
docker ps --format "{{.Names}}" | findstr /I "flutter_container" >nul
if %errorlevel% neq 0 (
    echo [Docker] Demarrage du conteneur Flutter...
    docker compose up -d
)

:: Relotransmet toutes les commandes saisies après "f" au conteneur
docker compose exec flutter-dev flutter %*

ENDLOCAL