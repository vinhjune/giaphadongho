import Papa from 'papaparse'
import { MEMBER_CSV_HEADERS, FAMILY_CSV_HEADERS } from '@giapha/shared/csv-schema'
import type { CsvMemberRow, CsvFamilyRow } from '@giapha/shared/csv-schema'

const VALID_GENDERS = new Set(['male', 'female', 'other', ''])
const VALID_STATUSES = new Set(['active', 'divorced', 'widowed', ''])

function isNumericOrEmpty(v: string) { return v === '' || /^\d+$/.test(v) }

export function parseMembersCsv(csv: string): { rows: CsvMemberRow[], errors: string[] } {
  const result = Papa.parse<CsvMemberRow>(csv, { header: true, skipEmptyLines: true })
  const errors: string[] = []

  const missingCols = MEMBER_CSV_HEADERS.filter(h => !result.meta.fields?.includes(h))
  if (missingCols.length) return { rows: [], errors: [`Missing columns: ${missingCols.join(', ')}`] }

  result.data.forEach((row, i) => {
    const line = i + 2
    if (!row.id) errors.push(`Row ${line}: id is required`)
    if (!row.name) errors.push(`Row ${line}: name is required`)
    if (!VALID_GENDERS.has(row.gender)) errors.push(`Row ${line}: invalid gender "${row.gender}"`)
    if (!isNumericOrEmpty(row.birthYear)) errors.push(`Row ${line}: birthYear must be numeric`)
    if (!isNumericOrEmpty(row.birthMonth)) errors.push(`Row ${line}: birthMonth must be numeric`)
    if (!isNumericOrEmpty(row.birthDay)) errors.push(`Row ${line}: birthDay must be numeric`)
    if (!isNumericOrEmpty(row.deathYear)) errors.push(`Row ${line}: deathYear must be numeric`)
    if (!['true', 'false', ''].includes(row.isAlive)) errors.push(`Row ${line}: isAlive must be true/false`)
  })

  return { rows: result.data, errors }
}

export function parseFamiliesCsv(csv: string): { rows: CsvFamilyRow[], errors: string[] } {
  const result = Papa.parse<CsvFamilyRow>(csv, { header: true, skipEmptyLines: true })
  const errors: string[] = []

  const missingCols = FAMILY_CSV_HEADERS.filter(h => !result.meta.fields?.includes(h))
  if (missingCols.length) return { rows: [], errors: [`Missing columns: ${missingCols.join(', ')}`] }

  result.data.forEach((row, i) => {
    const line = i + 2
    if (!row.id) errors.push(`Row ${line}: id is required`)
    if (!VALID_STATUSES.has(row.status)) errors.push(`Row ${line}: invalid status "${row.status}"`)
  })

  return { rows: result.data, errors }
}

export function validateImportData(members: CsvMemberRow[], families: CsvFamilyRow[]): string[] {
  const personIds = new Set(members.map(m => m.id))
  const errors: string[] = []

  members.forEach(m => {
    if (m.fatherId && !personIds.has(m.fatherId))
      errors.push(`Person "${m.name}" (${m.id}): fatherId "${m.fatherId}" không tồn tại trong members.csv`)
    if (m.motherId && !personIds.has(m.motherId))
      errors.push(`Person "${m.name}" (${m.id}): motherId "${m.motherId}" không tồn tại trong members.csv`)
  })

  families.forEach(f => {
    if (f.parent1Id && !personIds.has(f.parent1Id))
      errors.push(`Family "${f.id}": parent1Id "${f.parent1Id}" không tồn tại trong members.csv`)
    if (f.parent2Id && !personIds.has(f.parent2Id))
      errors.push(`Family "${f.id}": parent2Id "${f.parent2Id}" không tồn tại trong members.csv`)
  })

  return errors
}

export function buildFamilyMemberships(
  members: CsvMemberRow[],
  families: CsvFamilyRow[]
): { familyId: string, personId: string }[] {
  const memberships: { familyId: string, personId: string }[] = []
  for (const member of members) {
    if (!member.fatherId && !member.motherId) continue
    const family = families.find(f =>
      (f.parent1Id || '') === (member.fatherId || '') &&
      (f.parent2Id || '') === (member.motherId || '')
    )
    if (family) memberships.push({ familyId: family.id, personId: member.id })
  }
  return memberships
}

const toInt = (v: string) => v ? parseInt(v, 10) : null
const toBool = (v: string) => v === 'true'
const toStr = (v: string) => v || null

export function coerceMemberRow(r: CsvMemberRow) {
  return {
    id: r.id, name: r.name,
    gender: toStr(r.gender) as 'male' | 'female' | 'other' | null,
    nickname: toStr(r.nickname), bio: toStr(r.bio),
    address: toStr(r.address), email: toStr(r.email), phone: toStr(r.phone),
    birthYear: toInt(r.birthYear), birthMonth: toInt(r.birthMonth), birthDay: toInt(r.birthDay),
    birthIsLunar: toBool(r.birthIsLunar),
    deathYear: toInt(r.deathYear), deathMonth: toInt(r.deathMonth), deathDay: toInt(r.deathDay),
    deathIsLunar: toBool(r.deathIsLunar),
    isAlive: r.isAlive !== 'false',
    notes: toStr(r.notes),
  }
}

export function coerceFamilyRow(r: CsvFamilyRow) {
  return {
    id: r.id,
    parent1Id: toStr(r.parent1Id), parent2Id: toStr(r.parent2Id),
    orderP1: toInt(r.orderP1) ?? 1, orderP2: toInt(r.orderP2) ?? 1,
    marriedYear: toInt(r.marriedYear), marriedMonth: toInt(r.marriedMonth), marriedDay: toInt(r.marriedDay),
    marriedIsLunar: toBool(r.marriedIsLunar),
    endYear: toInt(r.endYear), endMonth: toInt(r.endMonth), endDay: toInt(r.endDay),
    status: toStr(r.status) as 'active' | 'divorced' | 'widowed' | null,
    notes: toStr(r.notes),
  }
}
