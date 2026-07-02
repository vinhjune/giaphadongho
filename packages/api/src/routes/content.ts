import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { eq } from 'drizzle-orm'
import { settings, events } from '@giapha/shared/schema'
import { requireEditor } from '../middleware/require-auth'
import type { HonoEnv } from '../types'

const contentRoutes = new Hono<HonoEnv>()
contentRoutes.use('*', requireEditor)

// ─── Settings (family name, intro text, founded year) ─────────────────────────

contentRoutes.get('/settings', async (c) => {
  const db = drizzle(c.env.giapha_db)
  const rows = await db.select().from(settings).all()
  return c.json(Object.fromEntries(rows.map(r => [r.key, r.value])))
})

contentRoutes.put('/settings', async (c) => {
  const db = drizzle(c.env.giapha_db)
  const body = await c.req.json<Record<string, string>>()
  const now = new Date().toISOString()
  for (const [key, value] of Object.entries(body)) {
    await db.insert(settings)
      .values({ key, value, updatedAt: now })
      .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: now } })
  }
  return c.json({ ok: true })
})

// ─── Events ───────────────────────────────────────────────────────────────────

contentRoutes.get('/events', async (c) => {
  const db = drizzle(c.env.giapha_db)
  return c.json(await db.select().from(events).all())
})

contentRoutes.post('/events', async (c) => {
  const db = drizzle(c.env.giapha_db)
  const body = await c.req.json<{ title?: string } & Partial<typeof events.$inferInsert>>()
  if (!body.title?.trim()) return c.json({ error: 'title is required' }, 400)
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  await db.insert(events).values({
    id,
    title: body.title.trim(),
    description: body.description ?? null,
    dateText: body.dateText ?? null,
    year: body.year ?? null,
    month: body.month ?? null,
    day: body.day ?? null,
    isLunar: body.isLunar ?? false,
    isRecurring: body.isRecurring ?? true,
    createdAt: now,
    updatedAt: now,
  })
  return c.json({ id }, 201)
})

contentRoutes.put('/events/:id', async (c) => {
  const db = drizzle(c.env.giapha_db)
  const body = await c.req.json<Partial<typeof events.$inferInsert>>()
  await db.update(events)
    .set({ ...body, updatedAt: new Date().toISOString() })
    .where(eq(events.id, c.req.param('id')))
  return c.json({ ok: true })
})

contentRoutes.delete('/events/:id', async (c) => {
  const db = drizzle(c.env.giapha_db)
  await db.delete(events).where(eq(events.id, c.req.param('id')))
  return c.json({ ok: true })
})

export default contentRoutes
