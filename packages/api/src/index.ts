import { Hono } from 'hono'
import { logger } from 'hono/logger'

type Bindings = {
  DB: D1Database
  SESSIONS: KVNamespace
  AVATARS: R2Bucket
  JWT_SECRET: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('*', logger())
// No CORS middleware: API and frontend are served from the same Worker origin.
// The Vite dev proxy (/api → :8787) makes CORS unnecessary even locally.

app.get('/api/health', (c) => c.json({ ok: true }))

export default app
