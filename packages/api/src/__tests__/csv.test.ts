import { UNIFIED_CSV_HEADERS, CSV_COLUMN_LABELS, CSV_COLUMN_FIELDS } from '@giapha/shared/csv-schema'
import { describe, it, expect } from 'vitest'

describe('CSV schema constants', () => {
  it('unified headers have 26 columns', () => {
    expect(UNIFIED_CSV_HEADERS).toHaveLength(26)
  })
  it('first column is type', () => {
    expect(UNIFIED_CSV_HEADERS[0]).toBe('type')
  })
  it('includes all person fields', () => {
    expect(UNIFIED_CSV_HEADERS).toContain('name')
    expect(UNIFIED_CSV_HEADERS).toContain('gender')
    expect(UNIFIED_CSV_HEADERS).toContain('fatherId')
    expect(UNIFIED_CSV_HEADERS).toContain('motherId')
    expect(UNIFIED_CSV_HEADERS).toContain('isAlive')
  })
  it('includes all family fields', () => {
    expect(UNIFIED_CSV_HEADERS).toContain('orderP1')
    expect(UNIFIED_CSV_HEADERS).toContain('orderP2')
    expect(UNIFIED_CSV_HEADERS).toContain('status')
  })
  it('does not include removed family date or parent columns', () => {
    expect(UNIFIED_CSV_HEADERS).not.toContain('parent1Id')
    expect(UNIFIED_CSV_HEADERS).not.toContain('parent2Id')
    expect(UNIFIED_CSV_HEADERS).not.toContain('marriedYear')
    expect(UNIFIED_CSV_HEADERS).not.toContain('marriedIsLunar')
    expect(UNIFIED_CSV_HEADERS).not.toContain('endYear')
  })
  it('does not include avatarKey', () => {
    expect(UNIFIED_CSV_HEADERS).not.toContain('avatarKey')
  })
  it('has no duplicate columns', () => {
    expect(new Set(UNIFIED_CSV_HEADERS).size).toBe(UNIFIED_CSV_HEADERS.length)
  })
})

describe('CSV_COLUMN_LABELS', () => {
  it('maps type → loai', () => expect(CSV_COLUMN_LABELS.type).toBe('loai'))
  it('maps id → ma', () => expect(CSV_COLUMN_LABELS.id).toBe('ma'))
  it('maps name → ho_ten', () => expect(CSV_COLUMN_LABELS.name).toBe('ho_ten'))
  it('maps isAlive → con_song', () => expect(CSV_COLUMN_LABELS.isAlive).toBe('con_song'))
  it('covers every field in UNIFIED_CSV_HEADERS', () => {
    UNIFIED_CSV_HEADERS.forEach(field => {
      expect(CSV_COLUMN_LABELS[field]).toBeTruthy()
    })
  })
  it('reverse map (CSV_COLUMN_FIELDS) round-trips correctly', () => {
    UNIFIED_CSV_HEADERS.forEach(field => {
      expect(CSV_COLUMN_FIELDS[CSV_COLUMN_LABELS[field]]).toBe(field)
    })
  })
})
