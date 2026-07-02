import { createMiddleware } from 'hono/factory'
import type { Bindings } from '../types'

/** Security headers — applied to all responses. */
export const securityHeaders = createMiddleware<{ Bindings: Bindings }>(async (c, next) => {
  await next()
  c.header('X-Content-Type-Options', 'nosniff')
  c.header('X-Frame-Options', 'DENY')
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin')
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  // CSP: allow same origin assets + R2 avatars served via /api/avatars (same origin)
  c.header('Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'"
  )
})

/**
 * Simple sliding-window rate limiter backed by KV.
 * Default: 60 requests per 60-second window per IP.
 * Designed for Cloudflare Workers free tier — KV writes are cheap.
 */
export function rateLimit(limit = 60, windowSecs = 60) {
  return createMiddleware<{ Bindings: Bindings }>(async (c, next) => {
    const ip = c.req.header('CF-Connecting-IP') ?? 'unknown'
    const key = `rl:${ip}:${Math.floor(Date.now() / (windowSecs * 1000))}`
    const current = Number(await c.env.SESSIONS.get(key) ?? '0')
    if (current >= limit) {
      return c.json({ error: 'Too many requests' }, 429)
    }
    await c.env.SESSIONS.put(key, String(current + 1), { expirationTtl: windowSecs })
    return next()
  })
}
