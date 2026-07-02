import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { asc } from 'drizzle-orm'
import { events, settings } from '@giapha/shared/schema'
import type { HonoEnv } from '../types'

const publicRoutes = new Hono<HonoEnv>()

publicRoutes.get('/landing', async (c) => {
  const db = drizzle(c.env.giapha_db)

  const [allSettings, allEvents] = await Promise.all([
    db.select().from(settings).all(),
    db.select().from(events).orderBy(asc(events.month), asc(events.day)).all(),
  ])

  const s = Object.fromEntries(allSettings.map(r => [r.key, r.value]))

  return c.json({
    familyName:  s['family_name']  ?? 'Gia Phả Dòng Họ',
    introText:   s['intro_text']   ?? '',
    foundedYear: s['founded_year'] ?? null,
    events: allEvents,
  })
})

export default publicRoutes
