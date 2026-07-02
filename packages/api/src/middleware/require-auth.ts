import { createMiddleware } from 'hono/factory'
import { verifyToken } from '../lib/auth'
import type { Bindings } from '../types'

export type UserContext = {
  id: string
  username: string
  role: 'editor' | 'viewer' | 'guest'
  sessionId?: string
}

/** Attaches user context to every request. Unauthenticated requests → role = 'guest'. */
export const attachUser = createMiddleware<{ Bindings: Bindings; Variables: { user: UserContext } }>(
  async (c, next) => {
    const authHeader = c.req.header('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      c.set('user', { id: '', username: 'guest', role: 'guest' })
      return next()
    }
    try {
      const token = authHeader.slice(7)
      const payload = await verifyToken(c.env.JWT_SECRET, token)
      // Check KV for session revocation
      const session = await c.env.SESSIONS.get(`sessions:${payload.sub}:${payload.sessionId}`)
      if (!session) return c.json({ error: 'Session expired' }, 401)
      c.set('user', { id: payload.sub, username: payload.username, role: payload.role, sessionId: payload.sessionId })
    } catch {
      return c.json({ error: 'Invalid token' }, 401)
    }
    return next()
  }
)

/** Requires viewer or editor role. */
export const requireAuth = createMiddleware<{ Bindings: Bindings; Variables: { user: UserContext } }>(
  async (c, next) => {
    const user = c.get('user') as UserContext
    if (user.role === 'guest') return c.json({ error: 'Login required' }, 401)
    return next()
  }
)

/** Requires editor role only. */
export const requireEditor = createMiddleware<{ Bindings: Bindings; Variables: { user: UserContext } }>(
  async (c, next) => {
    const user = c.get('user') as UserContext
    if (user.role !== 'editor') return c.json({ error: 'Forbidden' }, 403)
    return next()
  }
)
