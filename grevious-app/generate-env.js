// Script pour générer un fichier d'export des variables d'environnement pour le front
// Usage: node generate-env.js

const fs = require('fs');
const path = require('path');

// Liste des variables à injecter (ajoute ici celles dont tu as besoin)
const ENV_VARS = {
  API_URL: process.env.API_URL || 'http://localhost:3000',
  APP_ENV: process.env.APP_ENV || 'development',
  // Ajoute d'autres variables ici si besoin
};

const targetPath = path.join(__dirname, 'env.generated.js');

const fileContent =
  '// Ce fichier est généré automatiquement par generate-env.js\n' +
  'export const ENV = ' + JSON.stringify(ENV_VARS, null, 2) + ';\n';

fs.writeFileSync(targetPath, fileContent, 'utf8');
console.log('✅ env.generated.js généré avec succès !');
