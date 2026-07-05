import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const src = readFileSync(resolve(__dirname, '../PersonsTable.tsx'), 'utf-8')

describe('PersonsTable — childOrder column', () => {
  it('childOrder is editable', () => {
    const match = src.match(/field:\s*'childOrder'[^}]*editable:\s*(true|false)/s)
    expect(match).not.toBeNull()
    expect(match![1]).toBe('true')
  })

  it('childOrder uses number cell editor', () => {
    const match = src.match(/field:\s*'childOrder'[^}]*cellEditor:\s*'agNumberCellEditor'/s)
    expect(match).not.toBeNull()
  })
})

describe('PersonsTable — spouseOrders column', () => {
  it('spouseOrders is editable', () => {
    const match = src.match(/field:\s*'spouseOrders'[^}]*editable:\s*(true|false)/s)
    expect(match).not.toBeNull()
    expect(match![1]).toBe('true')
  })
})
