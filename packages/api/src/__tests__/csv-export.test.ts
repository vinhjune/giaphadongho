import { describe, it, expect } from 'vitest'
import { serializeToUnifiedCsv } from '../utils/csv-export'
import { UNIFIED_CSV_HEADERS } from '@giapha/shared/csv-schema'
import Papa from 'papaparse'

const personWithParents = {
  id: 'p1', name: 'Nguyễn Văn A', gender: 'male', nickname: 'Anh',
  bio: 'Tiểu sử', address: 'Hà Nội', email: 'a@test.com', phone: '0901234567',
  birthYear: 1990, birthMonth: 3, birthDay: 15, birthIsLunar: false,
  deathYear: null, deathMonth: null, deathDay: null, deathIsLunar: false,
  isAlive: true, notes: null, fatherId: 'p2', motherId: 'p3',
  username: null, userRole: null,
}
const personNoParents = {
  id: 'p2', name: 'Nguyễn Văn B', gender: 'male', nickname: null,
  bio: null, address: null, email: null, phone: null,
  birthYear: 1960, birthMonth: null, birthDay: null, birthIsLunar: false,
  deathYear: 2020, deathMonth: 5, deathDay: null, deathIsLunar: false,
  isAlive: false, notes: 'Ghi chú', fatherId: null, motherId: null,
  username: null, userRole: null,
}
const familyFixture = {
  id: 'f1', fatherId: 'p2', motherId: 'p3', orderP1: 1, orderP2: 1,
  status: 'active', notes: null,
}

describe('serializeToUnifiedCsv', () => {
  it('returns a string', () => {
    const csv = serializeToUnifiedCsv([personWithParents], [familyFixture])
    expect(typeof csv).toBe('string')
  })

  it('header row matches UNIFIED_CSV_HEADERS', () => {
    const csv = serializeToUnifiedCsv([personWithParents], [familyFixture])
    const parsed = Papa.parse(csv, { header: true })
    expect(parsed.meta.fields).toEqual([...UNIFIED_CSV_HEADERS])
  })

  it('person rows have type=person', () => {
    const csv = serializeToUnifiedCsv([personWithParents, personNoParents], [familyFixture])
    const rows = Papa.parse(csv, { header: true }).data as { type: string }[]
    const personRows = rows.filter(r => r.type === 'person')
    expect(personRows).toHaveLength(2)
  })

  it('family rows have type=family', () => {
    const csv = serializeToUnifiedCsv([personWithParents], [familyFixture])
    const rows = Papa.parse(csv, { header: true }).data as { type: string }[]
    const familyRows = rows.filter(r => r.type === 'family')
    expect(familyRows).toHaveLength(1)
  })

  it('person rows precede family rows in output', () => {
    const csv = serializeToUnifiedCsv([personWithParents], [familyFixture])
    const rows = Papa.parse(csv, { header: true }).data as { type: string }[]
    const firstFamilyIdx = rows.findIndex(r => r.type === 'family')
    const lastPersonIdx = rows.map(r => r.type).lastIndexOf('person')
    expect(lastPersonIdx).toBeLessThan(firstFamilyIdx)
  })

  it('serializes boolean false as "false"', () => {
    const csv = serializeToUnifiedCsv([personWithParents], [])
    const row = Papa.parse(csv, { header: true }).data[0] as Record<string, string>
    expect(row.birthIsLunar).toBe('false')
  })

  it('serializes boolean true as "true"', () => {
    const csv = serializeToUnifiedCsv([personWithParents], [])
    const row = Papa.parse(csv, { header: true }).data[0] as Record<string, string>
    expect(row.isAlive).toBe('true')
  })

  it('serializes null as empty string', () => {
    const csv = serializeToUnifiedCsv([personNoParents], [])
    const row = Papa.parse(csv, { header: true }).data[0] as Record<string, string>
    expect(row.deathDay).toBe('')
    expect(row.fatherId).toBe('')
    expect(row.motherId).toBe('')
  })

  it('serializes fatherId and motherId', () => {
    const csv = serializeToUnifiedCsv([personWithParents], [])
    const row = Papa.parse(csv, { header: true }).data[0] as Record<string, string>
    expect(row.fatherId).toBe('p2')
    expect(row.motherId).toBe('p3')
  })

  it('family row serializes fatherId and motherId', () => {
    const csv = serializeToUnifiedCsv([], [familyFixture])
    const row = Papa.parse(csv, { header: true }).data[0] as Record<string, string>
    expect(row.fatherId).toBe('p2')
    expect(row.motherId).toBe('p3')
    expect(row.status).toBe('active')
  })

  it('person row has empty family-only columns', () => {
    const csv = serializeToUnifiedCsv([personWithParents], [])
    const row = Papa.parse(csv, { header: true }).data[0] as Record<string, string>
    expect(row.orderP1).toBe('')
    expect(row.status).toBe('')
  })

  it('family row has empty person columns (except id, notes)', () => {
    const csv = serializeToUnifiedCsv([], [familyFixture])
    const row = Papa.parse(csv, { header: true }).data[0] as Record<string, string>
    expect(row.name).toBe('')
    expect(row.gender).toBe('')
    expect(row.birthYear).toBe('')
  })

  it('person with linked user exports username and userRole', () => {
    const personWithUser = { ...personWithParents, username: 'admin', userRole: 'editor' }
    const csv = serializeToUnifiedCsv([personWithUser], [])
    const row = Papa.parse(csv, { header: true }).data[0] as Record<string, string>
    expect(row.username).toBe('admin')
    expect(row.userRole).toBe('editor')
  })

  it('person without linked user has empty username and userRole', () => {
    const csv = serializeToUnifiedCsv([personNoParents], [])
    const row = Papa.parse(csv, { header: true }).data[0] as Record<string, string>
    expect(row.username).toBe('')
    expect(row.userRole).toBe('')
  })

  it('family row has empty username and userRole', () => {
    const csv = serializeToUnifiedCsv([], [familyFixture])
    const row = Papa.parse(csv, { header: true }).data[0] as Record<string, string>
    expect(row.username).toBe('')
    expect(row.userRole).toBe('')
  })
})
