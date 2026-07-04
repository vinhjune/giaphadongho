import { UNIFIED_CSV_HEADERS } from '@giapha/shared/csv-schema'
import { describe, it, expect } from 'vitest'

describe('CSV schema constants', () => {
  it('unified headers have 33 columns', () => {
    expect(UNIFIED_CSV_HEADERS).toHaveLength(33)
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
    expect(UNIFIED_CSV_HEADERS).toContain('parent1Id')
    expect(UNIFIED_CSV_HEADERS).toContain('parent2Id')
    expect(UNIFIED_CSV_HEADERS).toContain('marriedYear')
    expect(UNIFIED_CSV_HEADERS).toContain('status')
    expect(UNIFIED_CSV_HEADERS).toContain('orderP1')
  })
  it('does not include avatarKey', () => {
    expect(UNIFIED_CSV_HEADERS).not.toContain('avatarKey')
  })
  it('has no duplicate columns', () => {
    expect(new Set(UNIFIED_CSV_HEADERS).size).toBe(UNIFIED_CSV_HEADERS.length)
  })
})
