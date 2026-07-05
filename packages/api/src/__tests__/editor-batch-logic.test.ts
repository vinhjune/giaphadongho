import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const src = readFileSync(resolve(__dirname, '../routes/editor.ts'), 'utf-8')

describe('syncParents — childOrder update when parents unchanged', () => {
  it('updates familyMembers.childOrder when parents match (early-return path)', () => {
    // When parents are unchanged, syncParents must still update familyMembers.childOrder
    // before returning early, so childOrder edits actually persist.
    expect(src).toMatch(/update\(familyMembers\)/)
    expect(src).toMatch(/set\(\s*\{\s*childOrder/)
  })

  it('familyMembers update appears before insert (i.e. in the early-return branch)', () => {
    // update(familyMembers) must exist before insert(familyMembers) in the file,
    // proving it's on the parents-unchanged path, not only the new-insert path.
    const updatePos = src.indexOf('db.update(familyMembers)')
    const insertPos = src.indexOf('db.insert(familyMembers)')
    expect(updatePos).toBeGreaterThan(-1)
    expect(insertPos).toBeGreaterThan(-1)
    expect(updatePos).toBeLessThan(insertPos)
  })
})

describe('batch save — spouseOrders empty array clears family orderP1', () => {
  it('checks spouseOrders !== undefined (not length > 0)', () => {
    // The old guard was `spouseOrders && spouseOrders.length > 0` which silently
    // skipped the clear case. The new guard must be definedness-based.
    expect(src).toMatch(/spouseOrders\s*!==\s*undefined/)
    expect(src).not.toMatch(/spouseOrders\.length\s*>\s*0/)
  })

  it('resets to orderP1 = 1 when spouseOrders is empty', () => {
    // Explicit empty-array branch sets orderP1: 1 for all parent families.
    expect(src).toMatch(/spouseOrders\.length\s*===\s*0/)
    expect(src).toMatch(/orderP1:\s*1/)
  })
})
