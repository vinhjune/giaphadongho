import { describe, it, expect } from 'vitest'
import { normalizeVietnamese, filterPersonsByName } from '../vietnamese-text'

describe('normalizeVietnamese', () => {
  it('strips all Vietnamese diacritics', () => {
    expect(normalizeVietnamese('Nguyễn')).toBe('nguyen')
    expect(normalizeVietnamese('Trần')).toBe('tran')
    expect(normalizeVietnamese('Hoàng')).toBe('hoang')
  })

  it('converts đ/Đ to d/D then lowercases', () => {
    expect(normalizeVietnamese('Đức')).toBe('duc')
    expect(normalizeVietnamese('đồng')).toBe('dong')
  })

  it('lowercases all characters', () => {
    expect(normalizeVietnamese('NGUYEN')).toBe('nguyen')
    expect(normalizeVietnamese('Văn')).toBe('van')
  })

  it('trims whitespace', () => {
    expect(normalizeVietnamese('  Văn  ')).toBe('van')
    expect(normalizeVietnamese('  ')).toBe('')
  })

  it('handles complex Vietnamese names', () => {
    expect(normalizeVietnamese('Nguyễn Văn Đức')).toBe('nguyen van duc')
    expect(normalizeVietnamese('Trần Thị Hồng')).toBe('tran thi hong')
  })

  it('handles empty string', () => {
    expect(normalizeVietnamese('')).toBe('')
  })
})

describe('filterPersonsByName', () => {
  const persons = [
    { name: 'Nguyễn Văn Đức', nickname: null },
    { name: 'Nguyễn Văn An', nickname: 'An' },
    { name: 'Trần Thị Hoa', nickname: null },
    { name: 'Lê Đình Phúc', nickname: 'Phúc' },
  ]

  it('returns empty array for empty query', () => {
    expect(filterPersonsByName('', persons)).toEqual([])
  })

  it('returns empty array for whitespace-only query', () => {
    expect(filterPersonsByName('   ', persons)).toEqual([])
  })

  it('matches name diacritic-insensitively', () => {
    const result = filterPersonsByName('nguyen van duc', persons)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Nguyễn Văn Đức')
  })

  it('matches "duc" against "Đức"', () => {
    const result = filterPersonsByName('duc', persons)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Nguyễn Văn Đức')
  })

  it('matches partial query case-insensitively', () => {
    const result = filterPersonsByName('nguyen', persons)
    expect(result).toHaveLength(2)
  })

  it('matches nickname', () => {
    const result = filterPersonsByName('phuc', persons)
    expect(result.some(p => p.name === 'Lê Đình Phúc')).toBe(true)
  })

  it('returns empty for no match', () => {
    expect(filterPersonsByName('xyz', persons)).toEqual([])
  })

  it('respects limit parameter', () => {
    const many = Array.from({ length: 20 }, (_, i) => ({
      name: `Nguyễn ${i}`,
      nickname: null,
    }))
    expect(filterPersonsByName('nguyen', many, 5)).toHaveLength(5)
  })

  it('uses default limit of 8', () => {
    const many = Array.from({ length: 20 }, (_, i) => ({
      name: `Nguyễn ${i}`,
      nickname: null,
    }))
    expect(filterPersonsByName('nguyen', many)).toHaveLength(8)
  })

  it('matches nickname diacritic-insensitively', () => {
    const result = filterPersonsByName('an', persons)
    expect(result.some(p => p.name === 'Nguyễn Văn An')).toBe(true)
  })
})
