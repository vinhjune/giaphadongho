import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { eq, and } from 'drizzle-orm'
import { persons, families, familyMembers } from '@giapha/shared/schema'
import { requireEditor } from '../middleware/require-auth'
import type { HonoEnv } from '../types'

const editorRoutes = new Hono<HonoEnv>()
editorRoutes.use('*', requireEditor)

// ─── Persons CRUD ─────────────────────────────────────────────────────────────

editorRoutes.post('/persons', async (c) => {
  const db = drizzle(c.env.giapha_db)
  const body = await c.req.json<{ name?: string } & Partial<typeof persons.$inferInsert>>()
  if (!body.name?.trim()) return c.json({ error: 'name is required' }, 400)
  const id = crypto.randomUUID()
  const { name, gender, nickname, bio, address, email, phone, birthYear, birthMonth, birthDay,
          birthIsLunar, deathYear, deathMonth, deathDay, deathIsLunar, isAlive, notes } = body
  await db.insert(persons).values({
    id, name: name.trim(), gender: gender ?? null, nickname: nickname ?? null, bio: bio ?? null,
    address: address ?? null, email: email ?? null, phone: phone ?? null,
    birthYear: birthYear ?? null, birthMonth: birthMonth ?? null, birthDay: birthDay ?? null,
    birthIsLunar: birthIsLunar ?? false,
    deathYear: deathYear ?? null, deathMonth: deathMonth ?? null, deathDay: deathDay ?? null,
    deathIsLunar: deathIsLunar ?? false,
    isAlive: isAlive ?? true, notes: notes ?? null,
  })
  return c.json({ id }, 201)
})

editorRoutes.put('/persons/:id', async (c) => {
  const db = drizzle(c.env.giapha_db)
  const body = await c.req.json<Partial<typeof persons.$inferInsert>>()
  const { id } = c.req.param()
  await db.update(persons).set({ ...body, updatedAt: new Date().toISOString() }).where(eq(persons.id, id))
  return c.json({ ok: true })
})

editorRoutes.delete('/persons/:id', async (c) => {
  const db = drizzle(c.env.giapha_db)
  await db.delete(persons).where(eq(persons.id, c.req.param('id')))
  return c.json({ ok: true })
})

// ─── Avatar upload via R2 ─────────────────────────────────────────────────────
// Client POSTs the file as multipart/form-data; Worker stores in R2 and updates avatarKey.

editorRoutes.post('/persons/:id/avatar', async (c) => {
  const db = drizzle(c.env.giapha_db)
  const personId = c.req.param('id')
  const formData = await c.req.formData()
  const file = formData.get('file') as File | null
  if (!file) return c.json({ error: 'Missing file' }, 400)

  const ext = file.name.split('.').pop() ?? 'jpg'
  const key = `avatars/${personId}.${ext}`
  await c.env.giapha_avatars.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type },
  })
  await db.update(persons).set({ avatarKey: key, updatedAt: new Date().toISOString() }).where(eq(persons.id, personId))
  return c.json({ avatarUrl: `/api/avatars/${key}` })
})

// ─── Families CRUD ────────────────────────────────────────────────────────────

editorRoutes.get('/families', async (c) => {
  const db = drizzle(c.env.giapha_db)
  const [allFamilies, allMembers] = await Promise.all([
    db.select().from(families).all(),
    db.select().from(familyMembers).all(),
  ])
  const membersByFamily = allMembers.reduce<Record<string, string[]>>((acc, m) => {
    ;(acc[m.familyId] ??= []).push(m.personId)
    return acc
  }, {})
  return c.json(allFamilies.map(f => ({ ...f, children: membersByFamily[f.id] ?? [] })))
})

editorRoutes.post('/families', async (c) => {
  const db = drizzle(c.env.giapha_db)
  const body = await c.req.json<Partial<typeof families.$inferInsert>>()
  const id = crypto.randomUUID()
  await db.insert(families).values({ ...body, id })
  return c.json({ id }, 201)
})

editorRoutes.put('/families/:id', async (c) => {
  const db = drizzle(c.env.giapha_db)
  const body = await c.req.json<Partial<typeof families.$inferInsert>>()
  await db.update(families).set(body).where(eq(families.id, c.req.param('id')))
  return c.json({ ok: true })
})

editorRoutes.delete('/families/:id', async (c) => {
  const db = drizzle(c.env.giapha_db)
  await db.delete(families).where(eq(families.id, c.req.param('id')))
  return c.json({ ok: true })
})

// ─── Family members ───────────────────────────────────────────────────────────

editorRoutes.post('/families/:familyId/members/:personId', async (c) => {
  const db = drizzle(c.env.giapha_db)
  await db.insert(familyMembers).values({
    familyId: c.req.param('familyId'),
    personId: c.req.param('personId'),
  })
  return c.json({ ok: true }, 201)
})

editorRoutes.delete('/families/:familyId/members/:personId', async (c) => {
  const db = drizzle(c.env.giapha_db)
  await db.delete(familyMembers).where(
    and(
      eq(familyMembers.familyId, c.req.param('familyId')),
      eq(familyMembers.personId, c.req.param('personId'))
    )
  )
  return c.json({ ok: true })
})

export default editorRoutes
