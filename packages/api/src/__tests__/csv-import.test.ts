import { describe, it, expect } from 'vitest'
import {
  parseUnifiedCsv,
  validateImportData,
  buildFamilyMemberships,
} from '../utils/csv-import'
import { serializeToUnifiedCsv } from '../utils/csv-export'
import { CSV_COLUMN_LABELS } from '@giapha/shared/csv-schema'

// Minimal fixtures that produce valid unified CSV via the serializer
const personA = {
  id: 'p1', name: 'Nguyễn Văn A', gender: 'male' as const, nickname: null,
  bio: null, address: null, email: null, phone: null,
  birthYear: 1950, birthMonth: null, birthDay: null, birthIsLunar: false,
  deathYear: null, deathMonth: null, deathDay: null, deathIsLunar: false,
  isAlive: false, notes: null, fatherId: null, motherId: null,
  username: null, userRole: null,
}
const personB = {
  id: 'p2', name: 'Trần Thị B', gender: 'female' as const, nickname: null,
  bio: null, address: null, email: null, phone: null,
  birthYear: 1955, birthMonth: null, birthDay: null, birthIsLunar: false,
  deathYear: null, deathMonth: null, deathDay: null, deathIsLunar: false,
  isAlive: false, notes: null, fatherId: null, motherId: null,
  username: null, userRole: null,
}
const personChild = {
  id: 'p3', name: 'Nguyễn Văn Con', gender: 'male' as const, nickname: null,
  bio: null, address: null, email: null, phone: null,
  birthYear: 1980, birthMonth: null, birthDay: null, birthIsLunar: false,
  deathYear: null, deathMonth: null, deathDay: null, deathIsLunar: false,
  isAlive: true, notes: null, fatherId: 'p1', motherId: 'p2',
  username: null, userRole: null,
}
const familyAB = {
  id: 'f1', fatherId: 'p1', motherId: 'p2', orderP1: 1, orderP2: 1,
  status: 'active', notes: null,
}

function makeValidCsv() {
  return serializeToUnifiedCsv([personA, personB, personChild], [familyAB])
}

describe('parseUnifiedCsv', () => {
  it('returns members and families from valid CSV', () => {
    const result = parseUnifiedCsv(makeValidCsv())
    expect(result.errors).toHaveLength(0)
    expect(result.members).toHaveLength(3)
    expect(result.families).toHaveLength(1)
  })

  it('parses member id and name correctly', () => {
    const { members } = parseUnifiedCsv(makeValidCsv())
    expect(members[0].id).toBe('p1')
    expect(members[0].name).toBe('Nguyễn Văn A')
  })

  it('parses family fatherId correctly', () => {
    const { families } = parseUnifiedCsv(makeValidCsv())
    expect(families[0].id).toBe('f1')
    expect(families[0].fatherId).toBe('p1')
  })

  it('preserves fatherId and motherId on child member', () => {
    const { members } = parseUnifiedCsv(makeValidCsv())
    const child = members.find(m => m.id === 'p3')!
    expect(child.fatherId).toBe('p1')
    expect(child.motherId).toBe('p2')
  })

  it('returns error when type column is missing', () => {
    const csv = 'id,name\np1,Test'
    const result = parseUnifiedCsv(csv)
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.errors[0]).toMatch(/type/)
  })

  it('returns error for unknown type value', () => {
    const csv = makeValidCsv().replace(/^person/m, 'unknown')
    const result = parseUnifiedCsv(csv)
    expect(result.errors.some(e => /unknown/i.test(e))).toBe(true)
  })

  it('returns error when person is missing required name', () => {
    const noName = { ...personA, name: '' }
    const csv = serializeToUnifiedCsv([noName], [])
    const result = parseUnifiedCsv(csv)
    expect(result.errors.some(e => /name/i.test(e))).toBe(true)
  })

  it('returns error for invalid gender on person row', () => {
    const badGender = { ...personA, gender: 'INVALID' as 'male' }
    const csv = serializeToUnifiedCsv([badGender], [])
    const result = parseUnifiedCsv(csv)
    expect(result.errors.some(e => /gender/i.test(e))).toBe(true)
  })

  it('returns error for invalid status on family row', () => {
    const badStatus = { ...familyAB, status: 'INVALID' }
    const csv = serializeToUnifiedCsv([personA], [badStatus])
    const result = parseUnifiedCsv(csv)
    expect(result.errors.some(e => /status/i.test(e))).toBe(true)
  })

  it('returns error for non-numeric birthYear', () => {
    const csv = makeValidCsv().replace(/^(person,[^,]*,[^,]*,[^,]*,[^,]*,[^,]*,[^,]*,[^,]*,[^,]*,)(\d+)/m, '$1abc')
    const result = parseUnifiedCsv(csv)
    expect(result.errors.some(e => /birthYear/i.test(e))).toBe(true)
  })
})

describe('parseUnifiedCsv — userLinks', () => {
  it('returns empty userLinks when no person has a username', () => {
    const { userLinks } = parseUnifiedCsv(makeValidCsv())
    expect(userLinks).toHaveLength(0)
  })

  it('extracts userLink when person has non-empty username', () => {
    const withUser = { ...personA, username: 'admin', userRole: 'editor' }
    const csv = serializeToUnifiedCsv([withUser, personB, personChild], [familyAB])
    const { userLinks } = parseUnifiedCsv(csv)
    expect(userLinks).toHaveLength(1)
    expect(userLinks[0]).toEqual({ personId: 'p1', username: 'admin', userRole: 'editor' })
  })

  it('defaults userRole to viewer when empty in CSV', () => {
    const withUser = { ...personA, username: 'viewer1', userRole: null }
    const csv = serializeToUnifiedCsv([withUser], [])
    const { userLinks } = parseUnifiedCsv(csv)
    expect(userLinks[0].userRole).toBe('viewer')
  })

  it('parses without userLinks for old CSVs lacking the columns', () => {
    // Vietnamese headers: tai_khoan = username, vai_tro = userRole
    const csv = makeValidCsv().replace(/,tai_khoan,vai_tro/, '').replace(/,,$/gm, '')
    const result = parseUnifiedCsv(csv)
    expect(result.errors).toHaveLength(0)
    expect(result.userLinks).toHaveLength(0)
  })

  it('parses old CSVs with English headers (backward-compatible)', () => {
    // Replace Vietnamese header row with English equivalents
    const viCsv = makeValidCsv()
    const firstLine = viCsv.split('\n')[0]
    const enHeaders = firstLine.split(',').map((h: string) => {
      const found = Object.entries(CSV_COLUMN_LABELS).find(([, v]) => v === h)
      return found ? found[0] : h
    }).join(',')
    const enCsv = enHeaders + '\n' + viCsv.split('\n').slice(1).join('\n')
    const result = parseUnifiedCsv(enCsv)
    expect(result.errors).toHaveLength(0)
    expect(result.members).toHaveLength(3)
  })
})

describe('validateImportData', () => {
  it('returns no errors for valid cross-references', () => {
    const { members, families } = parseUnifiedCsv(makeValidCsv())
    expect(validateImportData(members, families)).toHaveLength(0)
  })

  it('returns error when fatherId references missing person', () => {
    const ghost = { ...personChild, fatherId: 'ghost-id' }
    const csv = serializeToUnifiedCsv([personA, personB, ghost], [familyAB])
    const { members, families } = parseUnifiedCsv(csv)
    const errors = validateImportData(members, families)
    expect(errors.some(e => e.includes('ghost-id'))).toBe(true)
  })

  it('returns error when family fatherId references missing person', () => {
    const ghostFamily = { ...familyAB, fatherId: 'ghost-id' }
    const csv = serializeToUnifiedCsv([personA, personB], [ghostFamily])
    const { members, families } = parseUnifiedCsv(csv)
    const errors = validateImportData(members, families)
    expect(errors.some(e => e.includes('ghost-id'))).toBe(true)
  })
})

describe('buildFamilyMemberships', () => {
  it('builds membership for child with matching family', () => {
    const { members, families } = parseUnifiedCsv(makeValidCsv())
    const memberships = buildFamilyMemberships(members, families)
    expect(memberships).toHaveLength(1)
    expect(memberships[0]).toEqual({ familyId: 'f1', personId: 'p3' })
  })

  it('skips persons with no parents', () => {
    const { members, families } = parseUnifiedCsv(makeValidCsv())
    const memberships = buildFamilyMemberships(members, families)
    const personIds = memberships.map(m => m.personId)
    expect(personIds).not.toContain('p1')
    expect(personIds).not.toContain('p2')
  })
})
