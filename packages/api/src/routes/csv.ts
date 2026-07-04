import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { eq, sql, inArray } from 'drizzle-orm'
import { persons, families, familyMembers } from '@giapha/shared/schema'
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
    })
    .from(persons)
    .leftJoin(familyMembers, eq(familyMembers.personId, persons.id))
    .leftJoin(families, eq(families.id, familyMembers.familyId))
    .all()

  const [allFamilies] = await Promise.all([
    db.select().from(families).all(),
  ])
  const csv = serializeToUnifiedCsv(
    personRows as Parameters<typeof serializeToUnifiedCsv>[0],
    allFamilies as Parameters<typeof serializeToUnifiedCsv>[1],
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
  const { members: memberRows, families: familyRows, errors: parseErrors } = parseUnifiedCsv(csvText)
  if (parseErrors.length) return c.json({ errors: parseErrors }, 400)

  const crossErrors = validateImportData(memberRows, familyRows)
  if (crossErrors.length) return c.json({ errors: crossErrors }, 400)

  const rawMemberships = buildFamilyMemberships(memberRows, familyRows)
  const db = drizzle(c.env.giapha_db)

  // Deduplicate by personId (CSV may contain duplicate person rows; last upsert wins,
  // but family_members has a unique constraint on person_id so we must deduplicate).
  const seenPersonIds = new Set<string>()
  const memberships = rawMemberships.filter(m => {
    if (seenPersonIds.has(m.personId)) return false
    seenPersonIds.add(m.personId)
    return true
  })

  const personValues = memberRows.map(coerceMemberRow)
  const familyValues = familyRows.map(coerceFamilyRow)
  const importedPersonIds = [...new Set(personValues.map(p => p.id))]

  // D1 local SQLite enforces a per-statement limit of 100 bound parameters.
  // Person/family upserts are one statement per row (18 or 14 params each → OK).
  // The DELETE IN clause and multi-row membership INSERT must stay ≤ 90 params
  // per statement (90 IDs for DELETE, 45 rows × 2 cols for membership INSERT).
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

  const personSet = personValues.map(p =>
    db.insert(persons).values(p).onConflictDoUpdate({
      target: persons.id,
      set: {
        name:         sql`excluded.name`,
        gender:       sql`excluded.gender`,
        nickname:     sql`excluded.nickname`,
        bio:          sql`excluded.bio`,
        address:      sql`excluded.address`,
        email:        sql`excluded.email`,
        phone:        sql`excluded.phone`,
        birthYear:    sql`excluded.birth_year`,
        birthMonth:   sql`excluded.birth_month`,
        birthDay:     sql`excluded.birth_day`,
        birthIsLunar: sql`excluded.birth_is_lunar`,
        deathYear:    sql`excluded.death_year`,
        deathMonth:   sql`excluded.death_month`,
        deathDay:     sql`excluded.death_day`,
        deathIsLunar: sql`excluded.death_is_lunar`,
        isAlive:      sql`excluded.is_alive`,
        notes:        sql`excluded.notes`,
      },
    })
  )
  const familySet = familyValues.map(f =>
    db.insert(families).values(f).onConflictDoUpdate({
      target: families.id,
      set: {
        parent1Id:      sql`excluded.parent1_id`,
        parent2Id:      sql`excluded.parent2_id`,
        orderP1:        sql`excluded.order_p1`,
        orderP2:        sql`excluded.order_p2`,
        marriedYear:    sql`excluded.married_year`,
        marriedMonth:   sql`excluded.married_month`,
        marriedDay:     sql`excluded.married_day`,
        marriedIsLunar: sql`excluded.married_is_lunar`,
        endYear:        sql`excluded.end_year`,
        endMonth:       sql`excluded.end_month`,
        endDay:         sql`excluded.end_day`,
        status:         sql`excluded.status`,
        notes:          sql`excluded.notes`,
      },
    })
  )

  // Step 1: clear old family memberships for imported persons (chunked IN clause)
  if (importedPersonIds.length > 0) {
    await runBatches(
      chunk(importedPersonIds, 90).map(ids => [
        db.delete(familyMembers).where(inArray(familyMembers.personId, ids)),
      ])
    )
  }

  // Step 2: upsert persons, then families (15 statements per batch)
  await runBatches(chunk(personSet, 15))
  await runBatches(chunk(familySet, 15))

  // Step 3: insert new family memberships; 45 rows × 2 cols = 90 params per statement
  if (memberships.length > 0) {
    await runBatches(
      chunk(memberships, 45).map(rows => [db.insert(familyMembers).values(rows)])
    )
  }

  return c.json({ imported: { persons: personValues.length, families: familyValues.length } })
})

export default csvRoutes
