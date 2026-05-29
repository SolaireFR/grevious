import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { cors } from 'hono/cors'
import fs from 'fs'

// --- CONFIGURATION ---
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const APP_ENV = process.env.APP_ENV || 'development';
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
const DB_PATH = '/data/db.json';

type Session = {
  password: string,
  tasks: any[],
  createdAt: string,
  lastAccess: string
};

// --- BASE DE DONNÉES (JSON) ---
function readDB(): Session[] {
  try {
    if (!fs.existsSync(DB_PATH)) return [];
    const data = fs.readFileSync(DB_PATH, 'utf8');
    const arr = JSON.parse(data);
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    console.error('Erreur lecture db.json:', e);
    return [];
  }
}

function writeDB(sessions: Session[]): boolean {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(sessions, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('Erreur écriture db.json:', e);
    return false;
  }
}

// --- INITIALISATION APPLICATIVE ---
const app = new Hono()
app.use('*', cors({ origin: CORS_ORIGIN }))

// Point de contrôle Santé API
app.get('/', (c) => c.json({ message: 'API OK', env: APP_ENV }))

// --- SESSIONS ---

// 1. GET /tasks : Récupérer les tâches d'un espace (Connexion)
app.get('/tasks', (c) => {
  const password = c.req.query('password');
  if (!password) return c.json({ error: 'Mot de passe requis' }, 400);

  const sessions = readDB();
  const sessionIndex = sessions.findIndex(s => s.password === password);
  if (sessionIndex === -1) return c.json({ error: 'Mot de passe invalide' }, 401);

  // Mise à jour de l'activité
  sessions[sessionIndex].lastAccess = new Date().toISOString();
  writeDB(sessions);

  return c.json({ tasks: sessions[sessionIndex].tasks });
});

// 2. POST /section : Créer un nouvel espace
app.post('/section', async (c) => {
  try {
    const { password } = await c.req.json();
    if (!password || typeof password !== 'string' || password.length < 3) {
      return c.json({ error: 'Mot de passe requis (min 3 caractères)' }, 400);
    }

    const sessions = readDB();
    if (sessions.some(s => s.password === password)) {
      return c.json({ error: 'Ce mot de passe existe déjà' }, 400);
    }

    const now = new Date().toISOString();
    sessions.push({ password, tasks: [], createdAt: now, lastAccess: now });
    writeDB(sessions);

    return c.json({ success: true });
  } catch {
    return c.json({ error: 'Requête invalide' }, 400);
  }
});

// 3. DELETE /section : Supprimer tout un espace
app.delete('/section', async (c) => {
  try {
    const { password } = await c.req.json();
    const sessions = readDB();
    
    const initialLength = sessions.length;
    const filteredSessions = sessions.filter(s => s.password !== password);

    if (filteredSessions.length === initialLength) {
      return c.json({ error: 'Espace introuvable' }, 404);
    }

    writeDB(filteredSessions);
    return c.json({ success: true, message: 'Espace supprimé' });
  } catch {
    return c.json({ error: 'Requête invalide' }, 400);
  }
});

// --- TÂCHES ---

// 4. POST /task : Ajouter une tâche
app.post('/task', async (c) => {
  try {
    const { password, task } = await c.req.json();
    if (!password || !task) return c.json({ error: 'Données manquantes' }, 400);

    const sessions = readDB();
    const sIdx = sessions.findIndex(s => s.password === password);
    if (sIdx === -1) return c.json({ error: 'Espace invalide' }, 401);

    sessions[sIdx].tasks.push(task);
    sessions[sIdx].lastAccess = new Date().toISOString();
    writeDB(sessions);

    return c.json({ success: true, message: 'Tâche ajoutée' });
  } catch {
    return c.json({ error: 'Requête invalide' }, 400);
  }
});

// 5. PATCH /task : Modifier une tâche existante
app.patch('/task', async (c) => {
  try {
    const { password, index, updates } = await c.req.json();
    if (!password || typeof index !== 'number' || !updates) {
      return c.json({ error: 'Données manquantes ou index invalide' }, 400);
    }

    const sessions = readDB();
    const sIdx = sessions.findIndex(s => s.password === password);
    if (sIdx === -1) return c.json({ error: 'Espace invalide' }, 401);

    const tasks = sessions[sIdx].tasks;
    if (index < 0 || index >= tasks.length) {
      return c.json({ error: 'Index introuvable' }, 404);
    }

    // Fusion de l'ancienne tâche avec les modifications
    sessions[sIdx].tasks[index] = { ...tasks[index], ...updates };
    sessions[sIdx].lastAccess = new Date().toISOString();
    writeDB(sessions);

    return c.json({ success: true, task: sessions[sIdx].tasks[index] });
  } catch {
    return c.json({ error: 'Requête invalide' }, 400);
  }
});

// 6. DELETE /task : Supprimer une tâche
app.delete('/task', async (c) => {
  try {
    const { password, index } = await c.req.json();
    if (!password || typeof index !== 'number') {
      return c.json({ error: 'Données manquantes' }, 400);
    }

    const sessions = readDB();
    const sIdx = sessions.findIndex(s => s.password === password);
    if (sIdx === -1) return c.json({ error: 'Espace invalide' }, 401);

    if (index < 0 || index >= sessions[sIdx].tasks.length) {
      return c.json({ error: 'Index introuvable' }, 404);
    }

    sessions[sIdx].tasks.splice(index, 1);
    sessions[sIdx].lastAccess = new Date().toISOString();
    writeDB(sessions);

    return c.json({ success: true, message: 'Tâche supprimée' });
  } catch {
    return c.json({ error: 'Requête invalide' }, 400);
  }
});

// --- LANCEMENT ---
serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`🚀 Serveur actif sur http://localhost:${info.port} [${APP_ENV}]`)
})