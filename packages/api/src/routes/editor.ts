import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { persons, families, familyMembers, users } from '@giapha/shared/schema'
import { hashPassword } from '../lib/auth'
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

// ─── User management ─────────────────────────────────────────────────────────

// GET /api/editor/users — list users with linked person name
editorRoutes.get('/users', async (c) => {
  const db = drizzle(c.env.giapha_db)
  const allUsers = await db.select({
    id:       users.id,
    username: users.username,
    role:     users.role,
    isActive: users.isActive,
    personId: users.personId,
    createdAt: users.createdAt,
  }).from(users).all()

  // Fetch linked person names in one extra query
  const personIds = allUsers.map(u => u.personId).filter(Boolean) as string[]
  const linkedPersons = personIds.length > 0
    ? await db.select({ id: persons.id, name: persons.name }).from(persons).all()
    : []
  const personMap = Object.fromEntries(linkedPersons.map(p => [p.id, p.name]))

  return c.json(allUsers.map(u => ({
    ...u,
    personName: u.personId ? (personMap[u.personId] ?? null) : null,
  })))
})

const createUserSchema = z.object({
  username: z.string().min(1).max(64).regex(/^[a-zA-Z0-9_.-]+$/),
  role:     z.enum(['editor', 'viewer']).default('viewer'),
  personId: z.string().uuid().optional(),
})

// POST /api/editor/users — create a new user account
editorRoutes.post('/users', async (c) => {
  const parsed = createUserSchema.safeParse(await c.req.json())
  if (!parsed.success) return c.json({ error: 'Dữ liệu không hợp lệ' }, 400)
  const { username, role, personId } = parsed.data

  const db = drizzle(c.env.giapha_db)
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.username, username)).get()
  if (existing) return c.json({ error: 'Tên đăng nhập đã tồn tại' }, 409)

  // Password defaults to username — user must change it after first login
  const passwordHash = await hashPassword(username)
  const id = crypto.randomUUID()
  await db.insert(users).values({ id, username, passwordHash, role, personId: personId ?? null })
  return c.json({ id, username, role }, 201)
})

// POST /api/editor/persons/:id/user — quick-create user linked to this person
editorRoutes.post('/persons/:id/user', async (c) => {
  const personId = c.req.param('id')
  const body = await c.req.json<{ username?: string; role?: 'editor' | 'viewer' }>()
  if (!body.username?.trim()) return c.json({ error: 'username là bắt buộc' }, 400)
  const username = body.username.trim()
  const role = body.role ?? 'viewer'

  const db = drizzle(c.env.giapha_db)

  const person = await db.select({ id: persons.id }).from(persons).where(eq(persons.id, personId)).get()
  if (!person) return c.json({ error: 'Thành viên không tồn tại' }, 404)

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.username, username)).get()
  if (existing) return c.json({ error: 'Tên đăng nhập đã tồn tại' }, 409)

  // Check person not already linked to another user
  const linked = await db.select({ id: users.id }).from(users).where(eq(users.personId, personId)).get()
  if (linked) return c.json({ error: 'Thành viên này đã có tài khoản' }, 409)

  const passwordHash = await hashPassword(username)
  const id = crypto.randomUUID()
  await db.insert(users).values({ id, username, passwordHash, role, personId })
  return c.json({ id, username, role }, 201)
})

// PUT /api/editor/users/:id/person — link or unlink a person to a user
editorRoutes.put('/users/:id/person', async (c) => {
  const userId = c.req.param('id')
  const body = await c.req.json<{ personId: string | null }>()
  const db = drizzle(c.env.giapha_db)

  if (body.personId !== null) {
    const person = await db.select({ id: persons.id }).from(persons).where(eq(persons.id, body.personId)).get()
    if (!person) return c.json({ error: 'Thành viên không tồn tại' }, 404)

    // Check not already linked to a different user
    const linked = await db.select({ id: users.id }).from(users).where(eq(users.personId, body.personId)).get()
    if (linked && linked.id !== userId) return c.json({ error: 'Thành viên này đã được liên kết với tài khoản khác' }, 409)
  }

  await db.update(users).set({ personId: body.personId }).where(eq(users.id, userId))
  return c.json({ ok: true })
})

export default editorRoutes
