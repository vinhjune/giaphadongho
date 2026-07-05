import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { eq } from 'drizzle-orm'
import { persons, families, familyMembers, users } from '@giapha/shared/schema'
import { requireEditor } from '../middleware/require-auth'
import { serializeToUnifiedCsv } from '../utils/csv-export'
import { parseUnifiedCsv, validateImportData, buildFamilyMemberships, coerceMemberRow, coerceFamilyRow } from '../utils/csv-import'
import type { HonoEnv } from '../types'

const csvRoutes = new Hono<HonoEnv>()
csvRoutes.use('*', requireEditor)

csvRoutes.get('/export/csv', async (c) => {
  const db = drizzle(c.env.giapha_db)
  const today = new Date().toISOString().slice(0, 10)

  const personRows = await db
    .select({
      id:           persons.id,
      name:         persons.name,
      gender:       persons.gender,
      nickname:     persons.nickname,
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
      fatherId:     families.parent1Id,
      motherId:     families.parent2Id,
      childOrder:   familyMembers.childOrder,
      username:     users.username,
      userRole:     users.role,
    })
    .from(persons)
    .leftJoin(familyMembers, eq(familyMembers.personId, persons.id))
    .leftJoin(families, eq(families.id, familyMembers.familyId))
    .leftJoin(users, eq(users.personId, persons.id))
    .all()

  const allFamilies = await db
    .select({
      id:       families.id,
      fatherId: families.parent1Id,
      motherId: families.parent2Id,
      orderP1:  families.orderP1,
      orderP2:  families.orderP2,
      status:   families.status,
      notes:    families.notes,
    })
    .from(families)
    .all()

  const csv = serializeToUnifiedCsv(
    personRows as Parameters<typeof serializeToUnifiedCsv>[0],
    allFamilies,
  )

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="gia-pha-export-${today}.csv"`,
    },
  })
})

csvRoutes.post('/import/csv', async (c) => {
  const formData = await c.req.formData()
  const file = formData.get('file') as File | null
  if (!file) return c.json({ errors: ['No file uploaded'] }, 400)

  const csvText = await file.text()
  const { members: memberRows, families: familyRows, userLinks, errors: parseErrors } = parseUnifiedCsv(csvText)
  if (parseErrors.length) return c.json({ errors: parseErrors }, 400)

  const crossErrors = validateImportData(memberRows, familyRows)
  if (crossErrors.length) return c.json({ errors: crossErrors }, 400)

  const db = drizzle(c.env.giapha_db)

  const personValues = memberRows.map(coerceMemberRow)
  const familyValues = familyRows.map(coerceFamilyRow)

  // Deduplicate persons/families in case CSV has duplicate IDs.
  const seenPersonIds = new Set<string>()
  const uniquePersonValues = personValues.filter(p => {
    if (seenPersonIds.has(p.id)) return false
    seenPersonIds.add(p.id)
    return true
  })
  const seenFamilyIds = new Set<string>()
  const uniqueFamilyValues = familyValues.filter(f => {
    if (seenFamilyIds.has(f.id)) return false
    seenFamilyIds.add(f.id)
    return true
  })

  const rawMemberships = buildFamilyMemberships(memberRows, familyRows)
  const seenMemberPersonIds = new Set<string>()
  const memberships = rawMemberships.filter(m => {
    if (seenMemberPersonIds.has(m.personId)) return false
    seenMemberPersonIds.add(m.personId)
    return true
  })

  // D1 local SQLite enforces a per-statement limit of 100 bound parameters.
  // Multi-row INSERT chunks: persons 5×18=90, families 7×14=98, memberships 33×3=99.
  function chunk<T>(arr: T[], size: number): T[][] {
    const result: T[][] = []
    for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size))
    return result
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function runBatches(stmts: any[][]): Promise<void> {
    for (const batch of stmts) {
      if (batch.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await db.batch(batch as [any, ...any[]])
      }
    }
  }

  // Full replace: wipe existing data then insert fresh from CSV.
  await db.batch([
    db.delete(familyMembers),
    db.delete(families),
    db.delete(persons),
  ])

  await runBatches(chunk(uniquePersonValues, 5).map(rows => [db.insert(persons).values(rows)]))
  await runBatches(chunk(uniqueFamilyValues, 7).map(rows => [db.insert(families).values(rows)]))
  if (memberships.length > 0) {
    await runBatches(chunk(memberships, 33).map(rows => [db.insert(familyMembers).values(rows)]))
  }

  // Restore user↔person links from CSV, then null out any dangling refs not covered.
  const newPersonIds = new Set(uniquePersonValues.map(p => p.id))

  if (userLinks.length > 0) {
    for (const link of userLinks) {
      // Only restore the link if the person actually exists in the newly imported set.
      const resolvedPersonId = newPersonIds.has(link.personId) ? link.personId : null
      await db.update(users)
        .set({ personId: resolvedPersonId, role: link.userRole as 'editor' | 'viewer' })
        .where(eq(users.username, link.username))
    }
  }

  // Clear dangling personId refs for users not addressed by userLinks in this CSV.
  const linkedUsernames = new Set(userLinks.map(l => l.username))
  const allUsers = await db.select({ username: users.username, personId: users.personId }).from(users).all()
  for (const u of allUsers) {
    if (!linkedUsernames.has(u.username) && u.personId && !newPersonIds.has(u.personId)) {
      await db.update(users).set({ personId: null }).where(eq(users.username, u.username))
    }
  }

  return c.json({ imported: { persons: uniquePersonValues.length, families: uniqueFamilyValues.length } })
})

export default csvRoutes
