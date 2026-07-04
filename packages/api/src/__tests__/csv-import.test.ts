import { describe, it, expect } from 'vitest'
import {
  parseUnifiedCsv,
  validateImportData,
  buildFamilyMemberships,
} from '../utils/csv-import'
import { serializeToUnifiedCsv } from '../utils/csv-export'

// Minimal fixtures that produce valid unified CSV via the serializer
const personA = {
  id: 'p1', name: 'Nguyễn Văn A', gender: 'male' as const, nickname: null,
  bio: null, address: null, email: null, phone: null,
  birthYear: 1950, birthMonth: null, birthDay: null, birthIsLunar: false,
  deathYear: null, deathMonth: null, deathDay: null, deathIsLunar: false,
  isAlive: false, notes: null, fatherId: null, motherId: null,
}
const personB = {
  id: 'p2', name: 'Trần Thị B', gender: 'female' as const, nickname: null,
  bio: null, address: null, email: null, phone: null,
  birthYear: 1955, birthMonth: null, birthDay: null, birthIsLunar: false,
  deathYear: null, deathMonth: null, deathDay: null, deathIsLunar: false,
  isAlive: false, notes: null, fatherId: null, motherId: null,
}
const personChild = {
  id: 'p3', name: 'Nguyễn Văn Con', gender: 'male' as const, nickname: null,
  bio: null, address: null, email: null, phone: null,
  birthYear: 1980, birthMonth: null, birthDay: null, birthIsLunar: false,
  deathYear: null, deathMonth: null, deathDay: null, deathIsLunar: false,
  isAlive: true, notes: null, fatherId: 'p1', motherId: 'p2',
}
const familyAB = {
  id: 'f1', parent1Id: 'p1', parent2Id: 'p2', orderP1: 1, orderP2: 1,
  marriedYear: 1978, marriedMonth: null, marriedDay: null, marriedIsLunar: false,
  endYear: null, endMonth: null, endDay: null, status: 'active', notes: null,
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

  it('parses family parent1Id correctly', () => {
    const { families } = parseUnifiedCsv(makeValidCsv())
    expect(families[0].id).toBe('f1')
    expect(families[0].parent1Id).toBe('p1')
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

  it('returns error when family parent1Id references missing person', () => {
    const ghostFamily = { ...familyAB, parent1Id: 'ghost-id' }
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
