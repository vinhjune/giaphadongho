import { describe, it, expect } from 'vitest'
import { serializeMembersToCsv, serializeFamiliesToCsv, buildExportZip } from '../utils/csv-export'
import { MEMBER_CSV_HEADERS, FAMILY_CSV_HEADERS } from '@giapha/shared/csv-schema'
import Papa from 'papaparse'
import { unzipSync } from 'fflate'

const personWithParents = {
  id: 'p1', name: 'Nguyễn Văn A', gender: 'male', nickname: 'Anh',
  bio: 'Tiểu sử', address: 'Hà Nội', email: 'a@test.com', phone: '0901234567',
  birthYear: 1990, birthMonth: 3, birthDay: 15, birthIsLunar: false,
  deathYear: null, deathMonth: null, deathDay: null, deathIsLunar: false,
  isAlive: true, notes: null, fatherId: 'p2', motherId: 'p3',
}
const personNoParents = {
  id: 'p2', name: 'Nguyễn Văn B', gender: 'male', nickname: null,
  bio: null, address: null, email: null, phone: null,
  birthYear: 1960, birthMonth: null, birthDay: null, birthIsLunar: false,
  deathYear: 2020, deathMonth: 5, deathDay: null, deathIsLunar: false,
  isAlive: false, notes: 'Ghi chú', fatherId: null, motherId: null,
}
const familyFixture = {
  id: 'f1', parent1Id: 'p2', parent2Id: 'p3', orderP1: 1, orderP2: 1,
  marriedYear: 1985, marriedMonth: 6, marriedDay: 10, marriedIsLunar: true,
  endYear: null, endMonth: null, endDay: null, status: 'active', notes: null,
}

describe('serializeMembersToCsv', () => {
  it('produces header row matching MEMBER_CSV_HEADERS', () => {
    const csv = serializeMembersToCsv([personWithParents])
    const parsed = Papa.parse(csv, { header: true })
    expect(parsed.meta.fields).toEqual([...MEMBER_CSV_HEADERS])
  })
  it('serializes boolean false as "false"', () => {
    const csv = serializeMembersToCsv([personWithParents])
    const row = Papa.parse(csv, { header: true }).data[0] as Record<string, string>
    expect(row.birthIsLunar).toBe('false')
  })
  it('serializes boolean true as "true"', () => {
    const csv = serializeMembersToCsv([personWithParents])
    const row = Papa.parse(csv, { header: true }).data[0] as Record<string, string>
    expect(row.isAlive).toBe('true')
  })
  it('serializes null as empty string', () => {
    const csv = serializeMembersToCsv([personNoParents])
    const row = Papa.parse(csv, { header: true }).data[0] as Record<string, string>
    expect(row.deathDay).toBe('')
    expect(row.fatherId).toBe('')
    expect(row.motherId).toBe('')
  })
  it('serializes fatherId and motherId from joined data', () => {
    const csv = serializeMembersToCsv([personWithParents])
    const row = Papa.parse(csv, { header: true }).data[0] as Record<string, string>
    expect(row.fatherId).toBe('p2')
    expect(row.motherId).toBe('p3')
  })
  it('handles person with no parents (empty fatherId/motherId)', () => {
    const csv = serializeMembersToCsv([personNoParents])
    const row = Papa.parse(csv, { header: true }).data[0] as Record<string, string>
    expect(row.fatherId).toBe('')
    expect(row.motherId).toBe('')
  })
})

describe('serializeFamiliesToCsv', () => {
  it('produces header row matching FAMILY_CSV_HEADERS', () => {
    const csv = serializeFamiliesToCsv([familyFixture])
    const parsed = Papa.parse(csv, { header: true })
    expect(parsed.meta.fields).toEqual([...FAMILY_CSV_HEADERS])
  })
  it('serializes null dates as empty string', () => {
    const csv = serializeFamiliesToCsv([familyFixture])
    const row = Papa.parse(csv, { header: true }).data[0] as Record<string, string>
    expect(row.endYear).toBe('')
    expect(row.endMonth).toBe('')
  })
  it('serializes status enum correctly', () => {
    const csv = serializeFamiliesToCsv([familyFixture])
    const row = Papa.parse(csv, { header: true }).data[0] as Record<string, string>
    expect(row.status).toBe('active')
  })
  it('serializes marriedIsLunar boolean', () => {
    const csv = serializeFamiliesToCsv([familyFixture])
    const row = Papa.parse(csv, { header: true }).data[0] as Record<string, string>
    expect(row.marriedIsLunar).toBe('true')
  })
})

describe('buildExportZip', () => {
  it('returns a Uint8Array', () => {
    const zip = buildExportZip('a,b\n1,2', 'c,d\n3,4')
    expect(zip).toBeInstanceOf(Uint8Array)
  })
  it('ZIP contains members.csv and families.csv', () => {
    const zip = buildExportZip('header\nrow', 'header2\nrow2')
    const unzipped = unzipSync(zip)
    expect(Object.keys(unzipped)).toContain('members.csv')
    expect(Object.keys(unzipped)).toContain('families.csv')
  })
  it('CSV content survives ZIP round-trip', () => {
    const membersCSV = 'id,name\np1,Test'
    const zip = buildExportZip(membersCSV, 'id\nf1')
    const unzipped = unzipSync(zip)
    expect(new TextDecoder().decode(unzipped['members.csv'])).toBe(membersCSV)
  })
})
