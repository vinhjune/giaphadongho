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
    db.select({ id: families.id, parent1Id: families.parent1Id, parent2Id: families.parent2Id, orderP1: families.orderP1, orderP2: families.orderP2, status: families.status, notes: families.notes }).from(families).all(),
    db.select({ familyId: familyMembers.familyId, personId: familyMembers.personId, childOrder: familyMembers.childOrder }).from(familyMembers).all(),
  ])

  // Map personId → childOrder (person as child in their parent family)
  const childOrderMap = new Map<string, number | null>()
  for (const m of allMembers) childOrderMap.set(m.personId, m.childOrder ?? null)

  // Count how many families each person is a parent in (for spouse order badge)
  const parent1FamilyCount = new Map<string, number>()
  for (const f of allFamilies) {
    if (f.parent1Id) parent1FamilyCount.set(f.parent1Id, (parent1FamilyCount.get(f.parent1Id) ?? 0) + 1)
    if (f.parent2Id) parent1FamilyCount.set(f.parent2Id, (parent1FamilyCount.get(f.parent2Id) ?? 0) + 1)
  }

  // Endogamy detection: two spouses in a family share a common ancestor
  const personToParentFamily = new Map<string, string>()
  for (const m of allMembers) personToParentFamily.set(m.personId, m.familyId)
  const familyParents = new Map<string, string[]>()
  for (const f of allFamilies) {
    familyParents.set(f.id, [f.parent1Id, f.parent2Id].filter(Boolean) as string[])
  }
  function getAncestors(personId: string): Set<string> {
    const ancestors = new Set<string>()
    const queue = [personId]
    while (queue.length > 0) {
      const pid = queue.shift()!
      const fid = personToParentFamily.get(pid)
      if (!fid) continue
      for (const parent of familyParents.get(fid) ?? []) {
        if (!ancestors.has(parent)) { ancestors.add(parent); queue.push(parent) }
      }
    }
    return ancestors
  }
  let hasEndogamy = false
  outer: for (const f of allFamilies) {
    if (!f.parent1Id || !f.parent2Id) continue
    const a1 = getAncestors(f.parent1Id)
    const a2 = getAncestors(f.parent2Id)
    for (const a of a1) { if (a2.has(a)) { hasEndogamy = true; break outer } }
  }

  const nodes = [
    ...allPersons.map(p => ({
      id: p.id,
      type: 'person' as const,
      data: {
        ...(user.role === 'guest' ? toPublic(p) : toFull(p)),
        childOrder: childOrderMap.get(p.id) ?? null,
      },
      position: { x: 0, y: 0 },
    })),
    ...allFamilies.map(f => ({
      id: `family:${f.id}`,
      type: 'family' as const,
      data: {
        id: f.id,
        orderP1: f.orderP1,
        parent1FamilyCount: f.parent1Id ? (parent1FamilyCount.get(f.parent1Id) ?? 1) : 1,
      },
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
