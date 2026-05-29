
import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { cors } from 'hono/cors'

// Chargement des variables d'environnement (.env non utilisé, Docker gère les variables)
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const APP_ENV = process.env.APP_ENV || 'development';
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

import fs from 'fs';
import path from 'path';
// Fonction pour écrire la liste des sessions dans le fichier JSON
function writeDB(sessions: { password: string, tasks: any[] }[]) {
  try {
    const absPath = '/data/db.json';
    fs.writeFileSync(absPath, JSON.stringify(sessions, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('Erreur écriture db.json:', e);
    return false;
  }
}

// Fonction pour lire la liste des sessions depuis le fichier JSON
function readDB(): { password: string, tasks: any[] }[] {
  try {
    const absPath = '/data/db.json';
    if (!fs.existsSync(absPath)) {
      // Si le fichier n'existe pas, retourne une liste vide
      return [];
    }
    const data = fs.readFileSync(absPath, 'utf8');
    const arr = JSON.parse(data);
    return Array.isArray(arr) ? arr : [];
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
  const sessions = readDB();
  const password = c.req.query('password');
  if (!password || typeof password !== 'string') {
    return c.json({ error: 'Mot de passe requis' }, 401);
  }
  const session = sessions.find(s => s.password === password);
  if (!session) {
    return c.json({ error: 'Mot de passe invalide' }, 401);
  }
  return c.json({ tasks: session.tasks });
});

// Endpoint pour créer une nouvelle section (nouveau mot de passe, reset tâches)
app.post('/create-section', async (c) => {
  try {
    const body = await c.req.json();
    const password = body.password;
    if (!password || typeof password !== 'string' || password.length < 3) {
      return c.json({ error: 'Mot de passe requis (min 3 caractères)' }, 400);
    }
    // Ajoute une nouvelle session sans supprimer les autres
    const sessions = readDB();
    if (sessions.find(s => s.password === password)) {
      return c.json({ error: 'Ce mot de passe existe déjà' }, 400);
    }
    sessions.push({ password, tasks: [] });
    const ok = writeDB(sessions);
    if (!ok) {
      return c.json({ error: 'Erreur lors de la création' }, 500);
    }
    return c.json({ success: true });
  } catch (e) {
    return c.json({ error: 'Requête invalide' }, 400);
  }
});

// Lancement du serveur sur le port défini par la variable d'environnement
serve({
  fetch: app.fetch,
  port: PORT
}, (info) => {
  console.log(`Serveur lancé sur http://localhost:${info.port} [env: ${APP_ENV}]`)
})
