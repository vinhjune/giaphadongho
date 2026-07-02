import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { attachUser } from './middleware/require-auth'
import authRoutes from './routes/auth'
import publicRoutes from './routes/public'
import personsRoutes from './routes/persons'
import editorRoutes from './routes/editor'
import contentRoutes from './routes/content'
import type { HonoEnv } from './types'

const app = new Hono<HonoEnv>()

app.use('*', logger())
app.use('*', attachUser)
// No CORS middleware: API and frontend share the same Worker origin.
// The Vite dev proxy (/api → :8787) makes CORS unnecessary locally too.

app.get('/api/health', (c) => c.json({ ok: true }))
app.route('/api/auth', authRoutes)
app.route('/api/public', publicRoutes)
app.route('/api/persons', personsRoutes)
app.route('/api/editor', editorRoutes)
app.route('/api/content', contentRoutes)

// Serve R2 avatars — public read, no auth required
app.get('/api/avatars/:key{.+}', async (c) => {
  const key = c.req.param('key')
  const obj = await c.env.giapha_avatars.get(key)
  if (!obj) return c.json({ error: 'Not found' }, 404)
  const headers = new Headers()
  obj.writeHttpMetadata(headers)
  headers.set('cache-control', 'public, max-age=86400')
  return new Response(obj.body, { headers })
})

export default app
