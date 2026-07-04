import { MEMBER_CSV_HEADERS, FAMILY_CSV_HEADERS } from '@giapha/shared/csv-schema'
import { describe, it, expect } from 'vitest'

describe('CSV schema constants', () => {
  it('exports 20 member columns', () => {
    expect(MEMBER_CSV_HEADERS).toHaveLength(20)
  })
  it('exports 14 family columns', () => {
    expect(FAMILY_CSV_HEADERS).toHaveLength(14)
  })
  it('member headers include fatherId and motherId', () => {
    expect(MEMBER_CSV_HEADERS).toContain('fatherId')
    expect(MEMBER_CSV_HEADERS).toContain('motherId')
  })
  it('member headers do not include avatarKey', () => {
    expect(MEMBER_CSV_HEADERS).not.toContain('avatarKey')
  })
})
