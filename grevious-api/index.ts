
import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { cors } from 'hono/cors'

// Chargement des variables d'environnement (.env non utilisé, Docker gère les variables)
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const APP_ENV = process.env.APP_ENV || 'development';
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

import fs from 'fs';

// Fonction pour lire les tâches depuis le fichier JSON
function readTasks() {
  try {
    const absPath = '/data/db.json';
    if (!fs.existsSync(absPath)) {
      // Si le fichier n'existe pas, retourne un tableau vide
      return [];
    }
    const data = fs.readFileSync(absPath, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    console.error('Erreur lecture db.json:', e);
    return [];
  }
}


const app = new Hono()
app.use('*', cors({ origin: CORS_ORIGIN }))

app.get('/', (c) => {
  return c.json({
    message: 'API OK'
  })
})

// Endpoint pour fournir une liste de tâches mock
// Endpoint pour fournir la liste des tâches depuis le fichier JSON
app.get('/tasks', (c) => {
  const tasks = readTasks();
  return c.json({ tasks });
});

// Lancement du serveur sur le port défini par la variable d'environnement
serve({
  fetch: app.fetch,
  port: PORT
}, (info) => {
  console.log(`Serveur lancé sur http://localhost:${info.port} [env: ${APP_ENV}]`)
})
