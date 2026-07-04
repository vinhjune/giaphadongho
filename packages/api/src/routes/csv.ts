import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { eq, sql, inArray } from 'drizzle-orm'
import { unzipSync } from 'fflate'
import { persons, families, familyMembers } from '@giapha/shared/schema'
import { requireEditor } from '../middleware/require-auth'
import { serializeMembersToCsv, serializeFamiliesToCsv, buildExportZip } from '../utils/csv-export'
import { parseMembersCsv, parseFamiliesCsv, validateImportData, buildFamilyMemberships, coerceMemberRow, coerceFamilyRow } from '../utils/csv-import'
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

  const [allFamilies, allMembers] = await Promise.all([
    db.select().from(families).all(),
    db.select().from(familyMembers).all(),
  ])
  const membersByFamily = allMembers.reduce<Record<string, string[]>>((acc, m) => {
    ;(acc[m.familyId] ??= []).push(m.personId)
    return acc
  }, {})
  const familyRows = allFamilies.map(f => ({ ...f, children: membersByFamily[f.id] ?? [] }))

  const membersCSV = serializeMembersToCsv(personRows as Parameters<typeof serializeMembersToCsv>[0])
  const familiesCSV = serializeFamiliesToCsv(familyRows as Parameters<typeof serializeFamiliesToCsv>[0])
  const zip = buildExportZip(membersCSV, familiesCSV)

  return new Response(zip, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="gia-pha-export-${today}.zip"`,
    },
  })
})

csvRoutes.post('/import/csv', async (c) => {
  const formData = await c.req.formData()
  const file = formData.get('file') as File | null
  if (!file) return c.json({ errors: ['No file uploaded'] }, 400)

  const buf = new Uint8Array(await file.arrayBuffer())
  let unzipped: Record<string, Uint8Array>
  try {
    unzipped = unzipSync(buf)
  } catch {
    return c.json({ errors: ['Invalid ZIP file'] }, 400)
  }

  const decoder = new TextDecoder()
  const membersCSV = unzipped['members.csv'] ? decoder.decode(unzipped['members.csv']) : null
  const familiesCSV = unzipped['families.csv'] ? decoder.decode(unzipped['families.csv']) : null

  if (!membersCSV) return c.json({ errors: ['members.csv not found in ZIP'] }, 400)
  if (!familiesCSV) return c.json({ errors: ['families.csv not found in ZIP'] }, 400)

  const { rows: memberRows, errors: mErr } = parseMembersCsv(membersCSV)
  const { rows: familyRows, errors: fErr } = parseFamiliesCsv(familiesCSV)
  const parseErrors = [...mErr, ...fErr]
  if (parseErrors.length) return c.json({ errors: parseErrors }, 400)

  const crossErrors = validateImportData(memberRows, familyRows)
  if (crossErrors.length) return c.json({ errors: crossErrors }, 400)

  const memberships = buildFamilyMemberships(memberRows, familyRows)
  const db = drizzle(c.env.giapha_db)

  const personValues = memberRows.map(coerceMemberRow)
  const familyValues = familyRows.map(coerceFamilyRow)
  const importedPersonIds = personValues.map(p => p.id)

  // Atomic import via D1 batch: upsert persons → upsert families → rebuild memberships
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const statements: any[] = [
    db.insert(persons).values(personValues).onConflictDoUpdate({
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
    }),
    db.insert(families).values(familyValues).onConflictDoUpdate({
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
    }),
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
