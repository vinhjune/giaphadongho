import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { users, persons } from '@giapha/shared/schema'
import { hashPassword, verifyPassword, signToken } from '../lib/auth'
import { requireAuth } from '../middleware/require-auth'
import type { HonoEnv } from '../types'
import type { PersonFull } from '@giapha/shared/types'

const SESSION_TTL = 7 * 24 * 60 * 60

const profileRoutes = new Hono<HonoEnv>()
profileRoutes.use('*', requireAuth)

function toFull(p: typeof persons.$inferSelect): PersonFull {
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
    ngoaiToc: p.ngoaiToc,
    thuTuDoi: p.thuTuDoi ?? null,
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

// GET /api/profile — current user info + linked person
profileRoutes.get('/', async (c) => {
  const authUser = c.get('user')
  const db = drizzle(c.env.giapha_db)
  const user = await db.select().from(users).where(eq(users.id, authUser.id)).get()
  if (!user) return c.json({ error: 'User not found' }, 404)

  let person: PersonFull | null = null
  if (user.personId) {
    const p = await db.select().from(persons).where(eq(persons.id, user.personId)).get()
    if (p) person = toFull(p)
  }

  return c.json({
    id: user.id,
    username: user.username,
    role: user.role,
    personId: user.personId ?? null,
    person,
  })
})

// PUT /api/profile/person — update linked person's data
const personUpdateSchema = z.object({
  name:         z.string().min(1).max(200).optional(),
  gender:       z.enum(['male', 'female', 'other']).nullable().optional(),
  nickname:     z.string().max(100).nullable().optional(),
  bio:          z.string().max(2000).nullable().optional(),
  address:      z.string().max(500).nullable().optional(),
  email:        z.string().email().max(200).nullable().optional(),
  phone:        z.string().max(30).nullable().optional(),
  birthYear:    z.number().int().min(1000).max(2100).nullable().optional(),
  birthMonth:   z.number().int().min(1).max(12).nullable().optional(),
  birthDay:     z.number().int().min(1).max(31).nullable().optional(),
  birthIsLunar: z.boolean().optional(),
  deathYear:    z.number().int().min(1000).max(2100).nullable().optional(),
  deathMonth:   z.number().int().min(1).max(12).nullable().optional(),
  deathDay:     z.number().int().min(1).max(31).nullable().optional(),
  deathIsLunar: z.boolean().optional(),
  isAlive:      z.boolean().optional(),
  notes:        z.string().max(2000).nullable().optional(),
})

profileRoutes.put('/person', async (c) => {
  const authUser = c.get('user')
  const db = drizzle(c.env.giapha_db)
  const user = await db.select({ personId: users.personId }).from(users).where(eq(users.id, authUser.id)).get()
  if (!user?.personId) return c.json({ error: 'Tài khoản chưa được liên kết với thành viên trong gia phả' }, 400)

  const parsed = personUpdateSchema.safeParse(await c.req.json())
  if (!parsed.success) return c.json({ error: 'Dữ liệu không hợp lệ', details: parsed.error.flatten() }, 400)

  await db.update(persons)
    .set({ ...parsed.data, updatedAt: new Date().toISOString() })
    .where(eq(persons.id, user.personId))

  const updated = await db.select().from(persons).where(eq(persons.id, user.personId)).get()
  return c.json(updated ? toFull(updated) : { ok: true })
})

// PUT /api/profile/password — change password
const passwordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword:     z.string().min(6).max(128),
})

profileRoutes.put('/password', async (c) => {
  const authUser = c.get('user')
  const parsed = passwordSchema.safeParse(await c.req.json())
  if (!parsed.success) return c.json({ error: 'Dữ liệu không hợp lệ' }, 400)

  const db = drizzle(c.env.giapha_db)
  const user = await db.select().from(users).where(eq(users.id, authUser.id)).get()
  if (!user) return c.json({ error: 'User not found' }, 404)

  const valid = await verifyPassword(parsed.data.currentPassword, user.passwordHash)
  if (!valid) return c.json({ error: 'Mật khẩu hiện tại không đúng' }, 400)

  const newHash = await hashPassword(parsed.data.newPassword)
  await db.update(users).set({ passwordHash: newHash }).where(eq(users.id, user.id))
  return c.json({ ok: true })
})

// PUT /api/profile/username — change username; invalidates all sessions and returns a new token
const usernameSchema = z.object({
  newUsername: z.string().min(1).max(64).regex(/^[a-zA-Z0-9_.-]+$/, 'Tên đăng nhập chỉ được chứa chữ cái, số, _, ., -'),
  password:    z.string().min(1).max(128),
})

profileRoutes.put('/username', async (c) => {
  const authUser = c.get('user')
  const parsed = usernameSchema.safeParse(await c.req.json())
  if (!parsed.success) return c.json({ error: 'Dữ liệu không hợp lệ', details: parsed.error.flatten() }, 400)

  const db = drizzle(c.env.giapha_db)
  const user = await db.select().from(users).where(eq(users.id, authUser.id)).get()
  if (!user) return c.json({ error: 'User not found' }, 404)

  const valid = await verifyPassword(parsed.data.password, user.passwordHash)
  if (!valid) return c.json({ error: 'Mật khẩu không đúng' }, 400)

  // Check uniqueness
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.username, parsed.data.newUsername)).get()
  if (existing && existing.id !== user.id) return c.json({ error: 'Tên đăng nhập đã được sử dụng' }, 409)

  await db.update(users).set({ username: parsed.data.newUsername }).where(eq(users.id, user.id))

  // Invalidate all existing sessions
  const allSessions = await c.env.SESSIONS.list({ prefix: `sessions:${user.id}:` })
  await Promise.all(allSessions.keys.map(k => c.env.SESSIONS.delete(k.name)))

  // Issue a fresh session with the new username
  const sessionId = crypto.randomUUID()
  const token = await signToken(c.env.JWT_SECRET, {
    sub: user.id,
    username: parsed.data.newUsername,
    role: user.role as 'editor' | 'viewer',
    sessionId,
  })
  await c.env.SESSIONS.put(`sessions:${user.id}:${sessionId}`, '1', { expirationTtl: SESSION_TTL })

  return c.json({ ok: true, token, username: parsed.data.newUsername })
})

// POST /api/profile/avatar — upload avatar for linked person
profileRoutes.post('/avatar', async (c) => {
  const authUser = c.get('user')
  const db = drizzle(c.env.giapha_db)
  const user = await db.select({ personId: users.personId }).from(users).where(eq(users.id, authUser.id)).get()
  if (!user?.personId) return c.json({ error: 'Tài khoản chưa được liên kết với thành viên trong gia phả' }, 400)

  const formData = await c.req.formData()
  const file = formData.get('file') as File | null
  if (!file) return c.json({ error: 'Missing file' }, 400)

  const ext = file.name.split('.').pop() ?? 'jpg'
  const key = `avatars/${user.personId}.${ext}`
  await c.env.giapha_avatars.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type },
  })
  await db.update(persons)
    .set({ avatarKey: key, updatedAt: new Date().toISOString() })
    .where(eq(persons.id, user.personId))

  return c.json({ avatarUrl: `/api/avatars/${key}` })
})

export default profileRoutes
