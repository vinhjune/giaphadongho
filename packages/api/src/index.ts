import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { attachUser } from './middleware/require-auth'
import { securityHeaders, rateLimit } from './middleware/security'
import authRoutes from './routes/auth'
import publicRoutes from './routes/public'
import personsRoutes from './routes/persons'
import editorRoutes from './routes/editor'
import contentRoutes from './routes/content'
import profileRoutes from './routes/profile'
import type { HonoEnv } from './types'

const app = new Hono<HonoEnv>()

app.use('*', logger())
app.use('*', securityHeaders)
// Rate limit all API routes: 120 req / 60s per IP
app.use('/api/*', rateLimit(120, 60))
app.use('*', attachUser)
// No CORS middleware: API and frontend share the same Worker origin.
// The Vite dev proxy (/api → :8787) makes CORS unnecessary locally too.

app.get('/api/health', (c) => c.json({ ok: true }))
app.route('/api/auth', authRoutes)
app.route('/api/public', publicRoutes)
app.route('/api/persons', personsRoutes)
app.route('/api/editor', editorRoutes)
app.route('/api/content', contentRoutes)
app.route('/api/profile', profileRoutes)

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
