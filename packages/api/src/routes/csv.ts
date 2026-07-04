import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { eq } from 'drizzle-orm'
import { persons, families, familyMembers } from '@giapha/shared/schema'
import { requireEditor } from '../middleware/require-auth'
import { serializeMembersToCsv, serializeFamiliesToCsv, buildExportZip } from '../utils/csv-export'
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

export default csvRoutes
