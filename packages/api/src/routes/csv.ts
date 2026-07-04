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

  const memberships = buildFamilyMemberships(memberRows, familyRows)
  const db = drizzle(c.env.giapha_db)

  const personValues = memberRows.map(coerceMemberRow)
  const familyValues = familyRows.map(coerceFamilyRow)
  const importedPersonIds = personValues.map(p => p.id)

  // D1 local SQLite has a low bound-parameter limit per statement, so we upsert
  // one row at a time. Each individual statement stays well within the limit.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const statements: any[] = [
    ...personValues.map(p =>
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
    ),
    ...familyValues.map(f =>
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
    ),
  ]

  if (importedPersonIds.length > 0) {
    statements.push(
      db.delete(familyMembers).where(inArray(familyMembers.personId, importedPersonIds))
    )
  }

  if (memberships.length > 0) {
    statements.push(
      db.insert(familyMembers).values(memberships)
    )
  }

  await db.batch(statements as [typeof statements[0], ...typeof statements])

  return c.json({ imported: { persons: personValues.length, families: familyValues.length } })
})

export default csvRoutes
