import { Hono } from 'hono'
import { serve } from '@hono/node-server'

const app = new Hono()

app.get('/', (c) => {
  return c.json({
    message: 'API OK'
  })
})

// Endpoint pour fournir une liste de tâches mock
app.get('/tasks', (c) => {
  const tasks = [
    { id: 1, title: 'Acheter du lait', completed: false },
    { id: 2, title: 'Lire un livre', completed: true },
    { id: 3, title: 'Écrire du code', completed: false }
  ];
  return c.json({ tasks });
})

// Lancement du serveur sur le port 3000
serve({
  fetch: app.fetch,
  port: 3000
}, (info) => {
  console.log(`Serveur lancé sur http://localhost:${info.port}`)
})
