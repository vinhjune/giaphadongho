import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { eq, and, isNull, count, or, asc } from 'drizzle-orm'
import { z } from 'zod'
import { persons, families, familyMembers, users } from '@giapha/shared/schema'
import { hashPassword } from '../lib/auth'
import { requireEditor } from '../middleware/require-auth'
import type { HonoEnv } from '../types'
import type { DrizzleD1Database } from 'drizzle-orm/d1'
import type * as schema from '@giapha/shared/schema'

type DB = DrizzleD1Database<typeof schema>

// ─── Family sync helper ───────────────────────────────────────────────────────
// Sets a person's parents by finding/creating the matching family and moving
// the child. Deletes the old family if it becomes childless.
async function syncParents(
  db: DB,
  personId: string,
  fatherId: string | null,
  motherId: string | null,
  childOrder?: number | null,
) {
  // Find current family where this person is a child
  const currentMembership = await db
    .select({ familyId: familyMembers.familyId })
    .from(familyMembers)
    .where(eq(familyMembers.personId, personId))
    .get()

  if (currentMembership) {
    const currentFamily = await db
      .select({ id: families.id, parent1Id: families.parent1Id, parent2Id: families.parent2Id })
      .from(families)
      .where(eq(families.id, currentMembership.familyId))
      .get()

    if (currentFamily &&
        (currentFamily.parent1Id ?? null) === fatherId &&
        (currentFamily.parent2Id ?? null) === motherId) {
      if (childOrder !== undefined) {
        await db.update(familyMembers)
          .set({ childOrder: childOrder ?? null })
          .where(and(eq(familyMembers.personId, personId), eq(familyMembers.familyId, currentMembership.familyId)))
      }
      return
    }

    // Remove from current family
    await db.delete(familyMembers)
      .where(and(eq(familyMembers.personId, personId), eq(familyMembers.familyId, currentMembership.familyId)))

    // Delete current family if now childless
    const [{ remaining }] = await db
      .select({ remaining: count() })
      .from(familyMembers)
      .where(eq(familyMembers.familyId, currentMembership.familyId))
    if (remaining === 0) {
      await db.delete(families).where(eq(families.id, currentMembership.familyId))
    }
  }

  if (!fatherId && !motherId) return // no target parents — done

  // Find or create the target family for this (fatherId, motherId) pair
  const p1Cond = fatherId ? eq(families.parent1Id, fatherId) : isNull(families.parent1Id)
  const p2Cond = motherId ? eq(families.parent2Id, motherId) : isNull(families.parent2Id)
  let targetFamily = await db.select({ id: families.id }).from(families).where(and(p1Cond, p2Cond)).get()

  if (!targetFamily) {
    const newFamilyId = crypto.randomUUID()
    await db.insert(families).values({ id: newFamilyId, parent1Id: fatherId, parent2Id: motherId, orderP1: 1, orderP2: 1 })
    targetFamily = { id: newFamilyId }
  }

  await db.insert(familyMembers).values({ familyId: targetFamily.id, personId, childOrder: childOrder ?? null })
}

const editorRoutes = new Hono<HonoEnv>()
editorRoutes.use('*', requireEditor)

// ─── Persons CRUD ─────────────────────────────────────────────────────────────

// GET /api/editor/persons/with-parents — persons list with derived fatherId/motherId/childOrder/spouseOrders
// Must be registered before any :id routes to avoid param capture
editorRoutes.get('/persons/with-parents', async (c) => {
  const db = drizzle(c.env.giapha_db)
  const rows = await db
    .select({
      id:           persons.id,
      name:         persons.name,
      gender:       persons.gender,
      nickname:     persons.nickname,
      avatarKey:    persons.avatarKey,
      bio:          persons.bio,
      address:      persons.address,
      email:        persons.email,
      phone:        persons.phone,
      birthYear:    persons.birthYear,
      birthMonth:   persons.birthMonth,
      birthDay:     persons.birthDay,
      birthIsLunar: persons.birthIsLunar,
      deathYear:    persons.deathYear,
      deathMonth:   persons.deathMonth,
      deathDay:     persons.deathDay,
      deathIsLunar: persons.deathIsLunar,
      isAlive:      persons.isAlive,
      notes:        persons.notes,
      createdAt:    persons.createdAt,
      updatedAt:    persons.updatedAt,
      fatherId:     families.parent1Id,
      motherId:     families.parent2Id,
      childOrder:   familyMembers.childOrder,
    })
    .from(persons)
    .leftJoin(familyMembers, eq(familyMembers.personId, persons.id))
    .leftJoin(families, eq(families.id, familyMembers.familyId))
    .all()

  // Build spouseOrders: collect orderP1 for each family where person is parent1 or parent2
  const allFamilies = await db.select({
    parent1Id: families.parent1Id,
    parent2Id: families.parent2Id,
    orderP1:   families.orderP1,
  }).from(families).all()

  // Map personId → sorted list of orderP1 values from their spouse families
  const spouseOrderMap = new Map<string, number[]>()
  for (const f of allFamilies) {
    if (f.parent1Id) {
      const arr = spouseOrderMap.get(f.parent1Id) ?? []
      arr.push(f.orderP1)
      spouseOrderMap.set(f.parent1Id, arr)
    }
    if (f.parent2Id) {
      const arr = spouseOrderMap.get(f.parent2Id) ?? []
      arr.push(f.orderP1)
      spouseOrderMap.set(f.parent2Id, arr)
    }
  }

  return c.json(rows.map(r => ({
    id:           r.id,
    name:         r.name,
    gender:       r.gender ?? null,
    nickname:     r.nickname ?? null,
    avatarUrl:    r.avatarKey ? `/api/avatars/${r.avatarKey}` : null,
    bio:          r.bio ?? null,
    address:      r.address ?? null,
    email:        r.email ?? null,
    phone:        r.phone ?? null,
    birthYear:    r.birthYear ?? null,
    birthMonth:   r.birthMonth ?? null,
    birthDay:     r.birthDay ?? null,
    birthIsLunar: r.birthIsLunar ?? false,
    deathYear:    r.deathYear ?? null,
    deathMonth:   r.deathMonth ?? null,
    deathDay:     r.deathDay ?? null,
    deathIsLunar: r.deathIsLunar ?? false,
    isAlive:      r.isAlive,
    notes:        r.notes ?? null,
    fatherId:     r.fatherId ?? null,
    motherId:     r.motherId ?? null,
    childOrder:   r.childOrder ?? null,
    spouseOrders: (spouseOrderMap.get(r.id) ?? []).sort((a, b) => a - b),
  })))
})

// POST /api/editor/persons/batch — batch upsert + delete + family sync
// Must be registered before /persons/:id routes
const batchUpsertItemSchema = z.object({
  id:           z.string().min(1).optional(),
  name:         z.string().min(1),
  gender:       z.enum(['male', 'female', 'other']).nullable().optional(),
  nickname:     z.string().nullable().optional(),
  bio:          z.string().nullable().optional(),
  address:      z.string().nullable().optional(),
  email:        z.string().nullable().optional(),
  phone:        z.string().nullable().optional(),
  birthYear:    z.number().int().nullable().optional(),
  birthMonth:   z.number().int().nullable().optional(),
  birthDay:     z.number().int().nullable().optional(),
  birthIsLunar: z.boolean().optional(),
  deathYear:    z.number().int().nullable().optional(),
  deathMonth:   z.number().int().nullable().optional(),
  deathDay:     z.number().int().nullable().optional(),
  deathIsLunar: z.boolean().optional(),
  isAlive:      z.boolean().optional(),
  notes:        z.string().nullable().optional(),
  fatherId:     z.string().min(1).nullable().optional(),
  motherId:     z.string().min(1).nullable().optional(),
  childOrder:   z.number().int().min(1).nullable().optional(),
  spouseOrders: z.array(z.number().int().min(1)).optional(),
})

const batchSchema = z.object({
  upsert: z.array(batchUpsertItemSchema).optional().default([]),
  delete: z.array(z.string().min(1)).optional().default([]),
})

editorRoutes.post('/persons/batch', async (c) => {
  const parsed = batchSchema.safeParse(await c.req.json())
  if (!parsed.success) return c.json({ error: 'Dữ liệu không hợp lệ' }, 400)
  const { upsert, delete: deleteIds } = parsed.data

  const db = drizzle(c.env.giapha_db) as DB
  const saved: string[] = []
  const errors: { name: string; error: string }[] = []

  for (const item of upsert) {
    const { id, fatherId, motherId, ...fields } = item
    try {
      let personId: string
      if (id) {
        await db.update(persons)
          .set({ ...fields, updatedAt: new Date().toISOString() })
          .where(eq(persons.id, id))
        personId = id
      } else {
        personId = crypto.randomUUID()
        await db.insert(persons).values({
          id: personId,
          name: fields.name,
          gender:       fields.gender       ?? null,
          nickname:     fields.nickname     ?? null,
          bio:          fields.bio          ?? null,
          address:      fields.address      ?? null,
          email:        fields.email        ?? null,
          phone:        fields.phone        ?? null,
          birthYear:    fields.birthYear    ?? null,
          birthMonth:   fields.birthMonth   ?? null,
          birthDay:     fields.birthDay     ?? null,
          birthIsLunar: fields.birthIsLunar ?? false,
          deathYear:    fields.deathYear    ?? null,
          deathMonth:   fields.deathMonth   ?? null,
          deathDay:     fields.deathDay     ?? null,
          deathIsLunar: fields.deathIsLunar ?? false,
          isAlive:      fields.isAlive      ?? true,
          notes:        fields.notes        ?? null,
        })
      }

      // Sync parent/family assignment when fatherId or motherId is explicitly provided
      if ('fatherId' in item || 'motherId' in item) {
        await syncParents(db, personId, fatherId ?? null, motherId ?? null, item.childOrder ?? null)
      }

      // Update orderP1 of families where person is a parent (spouse order)
      if (item.spouseOrders !== undefined) {
        const parentFamilies = await db
          .select({ id: families.id })
          .from(families)
          .where(or(eq(families.parent1Id, personId), eq(families.parent2Id, personId)))
          .orderBy(asc(families.orderP1))
          .all()
        if (item.spouseOrders.length === 0) {
          for (const f of parentFamilies) {
            await db.update(families).set({ orderP1: 1 }).where(eq(families.id, f.id))
          }
        } else {
          for (let i = 0; i < Math.min(item.spouseOrders.length, parentFamilies.length); i++) {
            await db.update(families).set({ orderP1: item.spouseOrders[i] }).where(eq(families.id, parentFamilies[i].id))
          }
        }
      }

      saved.push(personId)
    } catch (err) {
      errors.push({ name: item.name, error: String(err) })
    }
  }

  const deleted: string[] = []
  for (const personId of deleteIds) {
    try {
      // Find families where this person is a child (via familyMembers)
      const membership = await db
        .select({ familyId: familyMembers.familyId })
        .from(familyMembers)
        .where(eq(familyMembers.personId, personId))
        .get()

      // Find families where this person is a parent (parent1_id or parent2_id)
      const parentFamilies1 = await db
        .select({ id: families.id })
        .from(families)
        .where(eq(families.parent1Id, personId))
        .all()
      const parentFamilies2 = await db
        .select({ id: families.id })
        .from(families)
        .where(eq(families.parent2Id, personId))
        .all()
      const parentFamilyIds = [...parentFamilies1, ...parentFamilies2].map(f => f.id)

      await db.delete(persons).where(eq(persons.id, personId))

      // Clean up child-of family if it now has no children
      if (membership) {
        const [{ remaining }] = await db
          .select({ remaining: count() })
          .from(familyMembers)
          .where(eq(familyMembers.familyId, membership.familyId))
        if (remaining === 0) {
          await db.delete(families).where(eq(families.id, membership.familyId))
        }
      }

      // Clean up parent-of families: after ON DELETE SET NULL, delete any family
      // where both parents are now null (no remaining parent)
      for (const familyId of parentFamilyIds) {
        const family = await db
          .select({ p1: families.parent1Id, p2: families.parent2Id })
          .from(families)
          .where(eq(families.id, familyId))
          .get()
        if (family && family.p1 === null && family.p2 === null) {
          await db.delete(families).where(eq(families.id, familyId))
        }
      }

      deleted.push(personId)
    } catch (err) {
      errors.push({ name: personId, error: String(err) })
    }
  }

  return c.json({ saved, deleted, errors }, errors.length > 0 ? 207 : 200)
})

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
    db.select({
      familyId:   familyMembers.familyId,
      personId:   familyMembers.personId,
      childOrder: familyMembers.childOrder,
    }).from(familyMembers).all(),
  ])
  const membersByFamily = allMembers.reduce<Record<string, { personId: string; childOrder: number | null }[]>>(
    (acc, m) => {
      ;(acc[m.familyId] ??= []).push({ personId: m.personId, childOrder: m.childOrder ?? null })
      return acc
    }, {})
  return c.json(allFamilies.map(f => ({ ...f, children: membersByFamily[f.id] ?? [] })))
})

editorRoutes.post('/families', async (c) => {
  const db = drizzle(c.env.giapha_db)
  const body = await c.req.json<Partial<typeof families.$inferInsert>>()
  const id = crypto.randomUUID()

  const { orderP1 = 1, orderP2 = 1, ...rest } = body

  await db.insert(families).values({ ...rest, id, orderP1, orderP2 })
  return c.json({ id, orderP1, orderP2 }, 201)
})

editorRoutes.put('/families/:id', async (c) => {
  const db = drizzle(c.env.giapha_db)
  const body = await c.req.json<Partial<typeof families.$inferInsert>>()

  await db.update(families).set(body).where(eq(families.id, c.req.param('id')))
  return c.json({ ok: true, orderP1: body.orderP1, orderP2: body.orderP2 })
})

editorRoutes.delete('/families/:id', async (c) => {
  const db = drizzle(c.env.giapha_db)
  await db.delete(families).where(eq(families.id, c.req.param('id')))
  return c.json({ ok: true })
})

// ─── Family members ───────────────────────────────────────────────────────────

editorRoutes.post('/families/:familyId/members/:personId', async (c) => {
  const db = drizzle(c.env.giapha_db)
  const body = await c.req.json<{ childOrder?: number | null }>().catch(() => ({}))
  await db.insert(familyMembers).values({
    familyId: c.req.param('familyId'),
    personId: c.req.param('personId'),
    childOrder: (body as { childOrder?: number | null }).childOrder ?? null,
  })
  return c.json({ ok: true }, 201)
})

editorRoutes.patch('/families/:familyId/members/:personId', async (c) => {
  const db = drizzle(c.env.giapha_db)
  const body = await c.req.json<{ childOrder: number | null }>()
  await db.update(familyMembers)
    .set({ childOrder: body.childOrder })
    .where(and(
      eq(familyMembers.familyId, c.req.param('familyId')),
      eq(familyMembers.personId, c.req.param('personId')),
    ))
  return c.json({ ok: true })
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
