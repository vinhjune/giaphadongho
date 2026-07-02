import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { attachUser } from './middleware/require-auth'
import authRoutes from './routes/auth'
import publicRoutes from './routes/public'
import type { HonoEnv } from './types'

const app = new Hono<HonoEnv>()

app.use('*', logger())
app.use('*', attachUser)
// No CORS middleware: API and frontend share the same Worker origin.
// The Vite dev proxy (/api → :8787) makes CORS unnecessary locally too.

app.get('/api/health', (c) => c.json({ ok: true }))
app.route('/api/auth', authRoutes)
app.route('/api/public', publicRoutes)

export default app
