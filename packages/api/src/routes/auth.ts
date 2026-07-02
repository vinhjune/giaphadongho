import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { eq } from 'drizzle-orm'
import { users } from '@giapha/shared/schema'
import { hashPassword, verifyPassword, signToken } from '../lib/auth'
import { requireAuth } from '../middleware/require-auth'
import type { HonoEnv } from '../types'

const SESSION_TTL = 7 * 24 * 60 * 60  // 7 days in seconds

const auth = new Hono<HonoEnv>()

auth.post('/login', async (c) => {
  const body = await c.req.json<{ username?: string; password?: string }>()
  if (!body.username || !body.password) {
    return c.json({ error: 'Missing credentials' }, 400)
  }

  const db = drizzle(c.env.giapha_db)
  const user = await db.select().from(users).where(eq(users.username, body.username)).get()
  if (!user || !user.isActive) return c.json({ error: 'Invalid credentials' }, 401)

  const valid = await verifyPassword(body.password, user.passwordHash)
  if (!valid) return c.json({ error: 'Invalid credentials' }, 401)

  const sessionId = crypto.randomUUID()
  const token = await signToken(c.env.JWT_SECRET, {
    sub: user.id,
    username: user.username,
    role: user.role as 'editor' | 'viewer',
    sessionId,
  })

  await c.env.SESSIONS.put(`sessions:${user.id}:${sessionId}`, '1', { expirationTtl: SESSION_TTL })

  return c.json({ token, role: user.role, username: user.username })
})

auth.post('/logout', requireAuth, async (c) => {
  const user = c.get('user')
  if (user.sessionId) {
    await c.env.SESSIONS.delete(`sessions:${user.id}:${user.sessionId}`)
  }
  return c.json({ ok: true })
})

auth.get('/me', requireAuth, async (c) => {
  const user = c.get('user')
  return c.json({ id: user.id, username: user.username, role: user.role })
})

export default auth
