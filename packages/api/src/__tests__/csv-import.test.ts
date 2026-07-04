import { describe, it, expect } from 'vitest'
import {
  parseMembersCsv, parseFamiliesCsv,
  validateImportData, buildFamilyMemberships
} from '../utils/csv-import'

const validMembersCSV = `id,name,gender,nickname,bio,address,email,phone,birthYear,birthMonth,birthDay,birthIsLunar,deathYear,deathMonth,deathDay,deathIsLunar,isAlive,notes,fatherId,motherId
p1,Nguyễn Văn A,male,Anh,,,,,1990,3,15,false,,,,,true,,p2,p3
p2,Nguyễn Văn B,male,,,,,,1960,,,false,2020,5,,false,false,,,
p3,Trần Thị C,female,,,,,,1965,,,false,,,,,true,,,`

const validFamiliesCSV = `id,parent1Id,parent2Id,orderP1,orderP2,marriedYear,marriedMonth,marriedDay,marriedIsLunar,endYear,endMonth,endDay,status,notes
f1,p2,p3,1,1,1985,6,10,true,,,,active,`

describe('parseMembersCsv', () => {
  it('parses valid CSV into CsvMemberRow array', () => {
    const { rows, errors } = parseMembersCsv(validMembersCSV)
    expect(errors).toHaveLength(0)
    expect(rows).toHaveLength(3)
    expect(rows[0].id).toBe('p1')
    expect(rows[0].fatherId).toBe('p2')
  })
  it('returns error for missing required id column', () => {
    const { errors } = parseMembersCsv('name\nBob')
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0]).toMatch(/id/)
  })
  it('returns error for missing required name column', () => {
    const { errors } = parseMembersCsv('id\np1')
    expect(errors.length).toBeGreaterThan(0)
  })
  it('returns error for invalid gender value', () => {
    const bad = validMembersCSV.replace(',male,', ',INVALID,')
    const { errors } = parseMembersCsv(bad)
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0]).toMatch(/gender/i)
  })
  it('returns error for non-numeric birthYear', () => {
    const bad = validMembersCSV.replace(',1990,', ',abc,')
    const { errors } = parseMembersCsv(bad)
    expect(errors.length).toBeGreaterThan(0)
  })
  it('treats empty string as null for nullable fields', () => {
    const { rows } = parseMembersCsv(validMembersCSV)
    expect(rows[1].nickname).toBe('')
    expect(rows[0].deathYear).toBe('')
  })
})

describe('parseFamiliesCsv', () => {
  it('parses valid CSV into CsvFamilyRow array', () => {
    const { rows, errors } = parseFamiliesCsv(validFamiliesCSV)
    expect(errors).toHaveLength(0)
    expect(rows[0].id).toBe('f1')
  })
  it('returns error for invalid status value', () => {
    const bad = validFamiliesCSV.replace(',active,', ',INVALID,')
    const { errors } = parseFamiliesCsv(bad)
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0]).toMatch(/status/i)
  })
})

describe('validateImportData', () => {
  it('returns no errors for valid cross-referenced data', () => {
    const { rows: members } = parseMembersCsv(validMembersCSV)
    const { rows: fams } = parseFamiliesCsv(validFamiliesCSV)
    expect(validateImportData(members, fams)).toHaveLength(0)
  })
  it('returns error when fatherId references non-existent member', () => {
    const bad = validMembersCSV.replace(',p2,p3', ',GHOST,p3')
    const { rows: members } = parseMembersCsv(bad)
    const { rows: fams } = parseFamiliesCsv(validFamiliesCSV)
    const errors = validateImportData(members, fams)
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0]).toMatch(/fatherId|không tồn tại/i)
  })
  it('returns error when family parent1Id references non-existent member', () => {
    const badFam = validFamiliesCSV.replace(',p2,', ',GHOST,')
    const { rows: members } = parseMembersCsv(validMembersCSV)
    const { rows: fams } = parseFamiliesCsv(badFam)
    const errors = validateImportData(members, fams)
    expect(errors.length).toBeGreaterThan(0)
  })
})

describe('buildFamilyMemberships', () => {
  it('matches person to family by fatherId+motherId pair', () => {
    const { rows: members } = parseMembersCsv(validMembersCSV)
    const { rows: fams } = parseFamiliesCsv(validFamiliesCSV)
    const memberships = buildFamilyMemberships(members, fams)
    expect(memberships).toContainEqual({ familyId: 'f1', personId: 'p1' })
  })
  it('returns empty for person with no parents', () => {
    const { rows: members } = parseMembersCsv(validMembersCSV)
    const { rows: fams } = parseFamiliesCsv(validFamiliesCSV)
    const memberships = buildFamilyMemberships(members, fams)
    const p2entry = memberships.find(m => m.personId === 'p2')
    expect(p2entry).toBeUndefined()
  })
})
