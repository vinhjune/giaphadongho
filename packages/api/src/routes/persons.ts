import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { eq } from 'drizzle-orm'
import { persons, families, familyMembers } from '@giapha/shared/schema'
import type { HonoEnv } from '../types'
import type { PersonPublic, PersonFull } from '@giapha/shared/types'

const personsRoutes = new Hono<HonoEnv>()

function toPublic(p: typeof persons.$inferSelect): PersonPublic {
  return {
    id: p.id,
    name: p.name,
    gender: p.gender ?? null,
    nickname: p.nickname ?? null,
    avatarUrl: p.avatarKey ? `/api/avatars/${p.avatarKey}` : null,
    birthYear: p.birthYear ?? null,
    birthMonth: p.birthMonth ?? null,
    birthDay: p.birthDay ?? null,
    birthIsLunar: p.birthIsLunar ?? false,
    isAlive: p.isAlive,
    notes: p.notes ?? null,
  }
}

function toFull(p: typeof persons.$inferSelect): PersonFull {
  return {
    ...toPublic(p),
    bio: p.bio ?? null,
    address: p.address ?? null,
    email: p.email ?? null,
    phone: p.phone ?? null,
    deathYear: p.deathYear ?? null,
    deathMonth: p.deathMonth ?? null,
    deathDay: p.deathDay ?? null,
    deathIsLunar: p.deathIsLunar ?? false,
  }
}

// GET /api/persons — role-aware: guest → PersonPublic[], auth → PersonFull[]
personsRoutes.get('/', async (c) => {
  const db = drizzle(c.env.giapha_db)
  const user = c.get('user')
  const rows = await db.select().from(persons).all()
  return c.json(user.role === 'guest' ? rows.map(toPublic) : rows.map(toFull))
})

// GET /api/persons/graph/data — MUST be registered before /:id to avoid param capture
// returns nodes + edges for tree visualization
personsRoutes.get('/graph/data', async (c) => {
  const db = drizzle(c.env.giapha_db)
  const user = c.get('user')

  const [allPersons, allFamilies, allMembers] = await Promise.all([
    db.select().from(persons).all(),
    db.select().from(families).all(),
    db.select().from(familyMembers).all(),
  ])

  // Endogamy detection: a person is both a parent and a listed child
  const childIds = new Set(allMembers.map(m => m.personId))
  const parentIds = new Set([
    ...allFamilies.flatMap(f => [f.parent1Id, f.parent2Id].filter(Boolean) as string[]),
  ])
  const hasEndogamy = [...childIds].some(id => parentIds.has(id))

  const nodes = [
    ...allPersons.map(p => ({
      id: p.id,
      type: 'person' as const,
      data: user.role === 'guest' ? toPublic(p) : toFull(p),
      position: { x: 0, y: 0 },
    })),
    ...allFamilies.map(f => ({
      id: `family:${f.id}`,
      type: 'family' as const,
      data: { id: f.id },
      position: { x: 0, y: 0 },
    })),
  ]

  const edges = [
    ...allFamilies.flatMap(f => {
      const result = []
      if (f.parent1Id) result.push({ id: `e-p1-${f.id}`, source: f.parent1Id, target: `family:${f.id}` })
      if (f.parent2Id) result.push({ id: `e-p2-${f.id}`, source: f.parent2Id, target: `family:${f.id}` })
      return result
    }),
    ...allMembers.map(m => ({
      id: `e-child-${m.familyId}-${m.personId}`,
      source: `family:${m.familyId}`,
      target: m.personId,
    })),
  ]

  return c.json({ nodes, edges, hasEndogamy })
})

// GET /api/persons/:id — single person
personsRoutes.get('/:id', async (c) => {
  const db = drizzle(c.env.giapha_db)
  const user = c.get('user')
  const p = await db.select().from(persons).where(eq(persons.id, c.req.param('id'))).get()
  if (!p) return c.json({ error: 'Not found' }, 404)
  return c.json(user.role === 'guest' ? toPublic(p) : toFull(p))
})

export default personsRoutes
