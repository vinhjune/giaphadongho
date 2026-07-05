import { describe, it, expect } from 'vitest'
import {
  buildAdjacency,
  computeHighlight,
  computeVisible,
  countHiddenDescendants,
  expandToReveal,
  type GraphEdge,
  type GraphNodeRef,
} from '../tree-traversal'

// ─── Fixtures ────────────────────────────────────────────────────────────────

/**
 * Linear 5-generation chain with spouses at every level:
 *
 *   gp1 + gp2 ─fg─► par
 *   par + par_sp ─fp─► foc      (foc = focus person)
 *   foc + foc_sp ─ff─► ch
 *   ch  + ch_sp  ─fc─► gch
 */
const MAIN_NODES: GraphNodeRef[] = [
  { id: 'gp1', type: 'person' }, { id: 'gp2', type: 'person' },
  { id: 'par', type: 'person' }, { id: 'par_sp', type: 'person' },
  { id: 'foc', type: 'person' }, { id: 'foc_sp', type: 'person' },
  { id: 'ch', type: 'person' },  { id: 'ch_sp', type: 'person' },
  { id: 'gch', type: 'person' },
  { id: 'fg', type: 'family' }, { id: 'fp', type: 'family' },
  { id: 'ff', type: 'family' }, { id: 'fc', type: 'family' },
]

const MAIN_EDGES: GraphEdge[] = [
  { id: 'e1',  source: 'gp1',    target: 'fg'  },
  { id: 'e2',  source: 'gp2',    target: 'fg'  },
  { id: 'e3',  source: 'fg',     target: 'par' },
  { id: 'e4',  source: 'par',    target: 'fp'  },
  { id: 'e5',  source: 'par_sp', target: 'fp'  },
  { id: 'e6',  source: 'fp',     target: 'foc' },
  { id: 'e7',  source: 'foc',    target: 'ff'  },
  { id: 'e8',  source: 'foc_sp', target: 'ff'  },
  { id: 'e9',  source: 'ff',     target: 'ch'  },
  { id: 'e10', source: 'ch',     target: 'fc'  },
  { id: 'e11', source: 'ch_sp',  target: 'fc'  },
  { id: 'e12', source: 'fc',     target: 'gch' },
]

/**
 * Endogamy fixture: cousins c1 and c2 (both grandchildren of a1+a2) marry.
 *
 *   a1 + a2 ─fan─► s1, s2
 *   s1 + s1sp ─fs1─► c1
 *   s2 + s2sp ─fs2─► c2
 *   c1 + c2   ─fc12─► h     (endogamous grandchild)
 */
const ENDOG_NODES: GraphNodeRef[] = [
  { id: 'a1',   type: 'person' }, { id: 'a2',   type: 'person' },
  { id: 's1',   type: 'person' }, { id: 's1sp', type: 'person' },
  { id: 's2',   type: 'person' }, { id: 's2sp', type: 'person' },
  { id: 'c1',   type: 'person' }, { id: 'c2',   type: 'person' },
  { id: 'h',    type: 'person' },
  { id: 'fan',  type: 'family' }, { id: 'fs1',  type: 'family' },
  { id: 'fs2',  type: 'family' }, { id: 'fc12', type: 'family' },
]

const ENDOG_EDGES: GraphEdge[] = [
  { id: 'ea1',  source: 'a1',   target: 'fan' },
  { id: 'ea2',  source: 'a2',   target: 'fan' },
  { id: 'es1',  source: 'fan',  target: 's1'  },
  { id: 'es2',  source: 'fan',  target: 's2'  },
  { id: 'es1p', source: 's1',   target: 'fs1' },
  { id: 'es1s', source: 's1sp', target: 'fs1' },
  { id: 'ec1',  source: 'fs1',  target: 'c1'  },
  { id: 'es2p', source: 's2',   target: 'fs2' },
  { id: 'es2s', source: 's2sp', target: 'fs2' },
  { id: 'ec2',  source: 'fs2',  target: 'c2'  },
  { id: 'ec1p', source: 'c1',   target: 'fc12'},
  { id: 'ec2p', source: 'c2',   target: 'fc12'},
  { id: 'eh',   source: 'fc12', target: 'h'   },
]

/** Simple 2-gen fixture for collapse tests: x+xs→fx→c; c+cs→fc→gc */
const SIMPLE_NODES: GraphNodeRef[] = [
  { id: 'x',  type: 'person' }, { id: 'xs',  type: 'person' },
  { id: 'c',  type: 'person' }, { id: 'cs',  type: 'person' },
  { id: 'gc', type: 'person' },
  { id: 'fx', type: 'family' }, { id: 'fc',  type: 'family' },
]

const SIMPLE_EDGES: GraphEdge[] = [
  { id: 's1', source: 'x',  target: 'fx' },
  { id: 's2', source: 'xs', target: 'fx' },
  { id: 's3', source: 'fx', target: 'c'  },
  { id: 's4', source: 'c',  target: 'fc' },
  { id: 's5', source: 'cs', target: 'fc' },
  { id: 's6', source: 'fc', target: 'gc' },
]

// ─── buildAdjacency ──────────────────────────────────────────────────────────

describe('buildAdjacency', () => {
  it('builds incomingOf correctly', () => {
    const adj = buildAdjacency(MAIN_EDGES)
    expect(adj.incomingOf.get('fg')).toEqual(expect.arrayContaining(['gp1', 'gp2']))
    expect(adj.incomingOf.get('par')).toEqual(['fg'])
    expect(adj.incomingOf.get('foc')).toEqual(['fp'])
  })

  it('builds outgoingOf correctly', () => {
    const adj = buildAdjacency(MAIN_EDGES)
    expect(adj.outgoingOf.get('fg')).toEqual(['par'])
    expect(adj.outgoingOf.get('foc')).toEqual(['ff'])
    expect(adj.outgoingOf.get('fc')).toEqual(['gch'])
  })

  it('builds edgeByPair correctly', () => {
    const adj = buildAdjacency(MAIN_EDGES)
    expect(adj.edgeByPair.get('gp1->fg')).toBe('e1')
    expect(adj.edgeByPair.get('fp->foc')).toBe('e6')
    expect(adj.edgeByPair.get('fc->gch')).toBe('e12')
  })

  it('handles empty edges', () => {
    const adj = buildAdjacency([])
    expect(adj.incomingOf.size).toBe(0)
    expect(adj.outgoingOf.size).toBe(0)
    expect(adj.edgeByPair.size).toBe(0)
  })
})

// ─── computeHighlight ────────────────────────────────────────────────────────

describe('computeHighlight', () => {
  describe('main fixture', () => {
    const adj = buildAdjacency(MAIN_EDGES)

    it('0/0 → focus node only', () => {
      const { nodeIds, edgeIds } = computeHighlight('foc', adj, 0, 0)
      expect(nodeIds).toEqual(new Set(['foc']))
      expect(edgeIds.size).toBe(0)
    })

    it('2/2 on foc → includes all 4 generations + spouses + family nodes', () => {
      const { nodeIds } = computeHighlight('foc', adj, 2, 2)
      // All persons
      expect(nodeIds).toContain('gp1')
      expect(nodeIds).toContain('gp2')
      expect(nodeIds).toContain('par')
      expect(nodeIds).toContain('par_sp')
      expect(nodeIds).toContain('foc')
      expect(nodeIds).toContain('foc_sp') // spouse rule
      expect(nodeIds).toContain('ch')
      expect(nodeIds).toContain('ch_sp')  // spouse rule
      expect(nodeIds).toContain('gch')
      // All family nodes
      expect(nodeIds).toContain('fg')
      expect(nodeIds).toContain('fp')
      expect(nodeIds).toContain('ff')
      expect(nodeIds).toContain('fc')
    })

    it('2/2 on foc → includes all edges', () => {
      const { edgeIds } = computeHighlight('foc', adj, 2, 2)
      for (let i = 1; i <= 12; i++) {
        expect(edgeIds, `edge e${i} should be included`).toContain(`e${i}`)
      }
    })

    it('2/0 on foc → includes ancestors but not descendants', () => {
      const { nodeIds } = computeHighlight('foc', adj, 2, 0)
      expect(nodeIds).toContain('gp1')
      expect(nodeIds).toContain('gp2')
      expect(nodeIds).toContain('par')
      expect(nodeIds).toContain('par_sp') // spouse rule: both parents of fp
      expect(nodeIds).toContain('fp')
      expect(nodeIds).toContain('foc')
      expect(nodeIds).not.toContain('ch')
      expect(nodeIds).not.toContain('gch')
      expect(nodeIds).not.toContain('ff')
    })

    it('0/2 on foc → includes descendants + spouses but not ancestors', () => {
      const { nodeIds } = computeHighlight('foc', adj, 0, 2)
      expect(nodeIds).toContain('foc')
      expect(nodeIds).toContain('foc_sp') // spouse rule: co-parent of ff
      expect(nodeIds).toContain('ch')
      expect(nodeIds).toContain('ch_sp')  // spouse rule
      expect(nodeIds).toContain('gch')
      expect(nodeIds).not.toContain('par')
      expect(nodeIds).not.toContain('gp1')
    })

    it('root node (gp1) with 2/0 → gp1 only (no ancestors)', () => {
      const { nodeIds, edgeIds } = computeHighlight('gp1', adj, 2, 0)
      expect(nodeIds).toEqual(new Set(['gp1']))
      expect(edgeIds.size).toBe(0)
    })

    it('leaf node (gch) with 0/2 → gch only (no descendants)', () => {
      const { nodeIds, edgeIds } = computeHighlight('gch', adj, 0, 2)
      expect(nodeIds).toEqual(new Set(['gch']))
      expect(edgeIds.size).toBe(0)
    })

    it('1/1 on foc → one generation each direction + spouses', () => {
      const { nodeIds } = computeHighlight('foc', adj, 1, 1)
      expect(nodeIds).toContain('par')
      expect(nodeIds).toContain('par_sp')
      expect(nodeIds).toContain('foc')
      expect(nodeIds).toContain('foc_sp')
      expect(nodeIds).toContain('ch')
      expect(nodeIds).not.toContain('gp1') // depth 2 excluded
      expect(nodeIds).not.toContain('gch') // depth 2 excluded
    })

    it('no dangling boundary family nodes', () => {
      // At depth=1 up from foc: par/par_sp included but not their parent families
      const { nodeIds } = computeHighlight('foc', adj, 1, 0)
      expect(nodeIds).toContain('fp')  // intermediate family (foc's parent family)
      expect(nodeIds).toContain('par')
      expect(nodeIds).toContain('par_sp')
      expect(nodeIds).not.toContain('fg') // par's parent family — excluded at depth boundary
      expect(nodeIds).not.toContain('gp1')
    })
  })

  describe('endogamy fixture', () => {
    const adj = buildAdjacency(ENDOG_EDGES)

    it('BFS terminates without infinite loop under endogamy', () => {
      // This should not throw or hang
      const result = computeHighlight('c1', adj, 3, 1)
      expect(result.nodeIds.size).toBeGreaterThan(0)
    })

    it('UP traversal from c1 finds ancestors without crossing to s2 branch', () => {
      const { nodeIds } = computeHighlight('c1', adj, 2, 0)
      expect(nodeIds).toContain('s1')
      expect(nodeIds).toContain('s1sp')
      expect(nodeIds).toContain('a1')
      expect(nodeIds).toContain('a2')
      expect(nodeIds).not.toContain('s2') // s2 is c1's uncle, not ancestor
      expect(nodeIds).not.toContain('c2')
    })

    it('DOWN traversal from c1 includes c2 via spouse rule', () => {
      const { nodeIds } = computeHighlight('c1', adj, 0, 1)
      expect(nodeIds).toContain('h')
      expect(nodeIds).toContain('c2')   // c2 is co-parent (spouse rule)
      expect(nodeIds).toContain('fc12')
      expect(nodeIds).not.toContain('s2') // c2's parent not traversed
    })
  })
})

// ─── computeVisible ──────────────────────────────────────────────────────────

describe('computeVisible', () => {
  describe('identity invariant', () => {
    it('empty collapsedIds → all nodes and edges visible', () => {
      const adj = buildAdjacency(MAIN_EDGES)
      const { nodeIds, edgeIds } = computeVisible(MAIN_NODES, adj, new Set())
      expect(nodeIds.size).toBe(MAIN_NODES.length)
      expect(edgeIds.size).toBe(MAIN_EDGES.length)
    })

    it('empty collapsedIds → parentless family node stays visible', () => {
      const extraNodes: GraphNodeRef[] = [
        ...MAIN_NODES,
        { id: 'orphan_fam', type: 'family' },
        { id: 'orphan_child', type: 'person' },
      ]
      const extraEdges: GraphEdge[] = [
        ...MAIN_EDGES,
        { id: 'oe1', source: 'orphan_fam', target: 'orphan_child' },
      ]
      const adj = buildAdjacency(extraEdges)
      const { nodeIds } = computeVisible(extraNodes, adj, new Set())
      expect(nodeIds).toContain('orphan_fam')
      expect(nodeIds).toContain('orphan_child')
    })
  })

  describe('simple fixture', () => {
    const adj = buildAdjacency(SIMPLE_EDGES)

    it('collapse x → x visible (badge), descendants hidden, married-in xs hidden', () => {
      const { nodeIds } = computeVisible(SIMPLE_NODES, adj, new Set(['x']))
      expect(nodeIds).toContain('x')   // collapsed node stays visible with badge
      expect(nodeIds).not.toContain('fx')  // x's outgoing family hidden
      expect(nodeIds).not.toContain('c')   // x's child hidden
      expect(nodeIds).not.toContain('fc')  // grandchild family hidden
      expect(nodeIds).not.toContain('gc')  // grandchild hidden
      expect(nodeIds).not.toContain('xs')  // married-in spouse of x (post-pass)
      expect(nodeIds).not.toContain('cs')  // c's spouse (post-pass: only connection is fc)
    })

    it('collapsed node x has no outgoing edges visible', () => {
      const { edgeIds } = computeVisible(SIMPLE_NODES, adj, new Set(['x']))
      // x→fx edge: x is visible (collapsed) but fx is hidden AND x is collapsed → not visible
      expect(edgeIds).not.toContain('s1') // x→fx
      expect(edgeIds).not.toContain('s2') // xs→fx (xs is hidden)
    })

    it('collapsed leaf gc → gc visible (badge), nothing else hidden', () => {
      const { nodeIds } = computeVisible(SIMPLE_NODES, adj, new Set(['gc']))
      expect(nodeIds).toContain('gc')
      expect(nodeIds).toContain('x')
      expect(nodeIds).toContain('c')
      expect(nodeIds).toContain('fc') // fc is gc's parent family — still visible
    })
  })

  describe('main fixture', () => {
    const adj = buildAdjacency(MAIN_EDGES)

    it('collapse par → par visible, its family + descendants hidden, par_sp hidden (post-pass)', () => {
      const { nodeIds } = computeVisible(MAIN_NODES, adj, new Set(['par']))
      expect(nodeIds).toContain('par')
      expect(nodeIds).toContain('gp1')
      expect(nodeIds).toContain('gp2')
      expect(nodeIds).toContain('fg')
      expect(nodeIds).not.toContain('fp')
      expect(nodeIds).not.toContain('foc')
      expect(nodeIds).not.toContain('par_sp') // post-pass: all incident edges hidden
    })
  })

  describe('endogamy fixture — strict collapse semantics', () => {
    const adj = buildAdjacency(ENDOG_EDGES)

    it('collapse s1 → h hidden even though c2 (via s2) is visible', () => {
      const { nodeIds } = computeVisible(ENDOG_NODES, adj, new Set(['s1']))
      expect(nodeIds).toContain('s1')   // collapsed (badge)
      expect(nodeIds).toContain('s2')   // not collapsed
      expect(nodeIds).toContain('c2')   // child of s2, visible
      expect(nodeIds).not.toContain('c1')   // child of s1, hidden
      expect(nodeIds).not.toContain('fc12') // hidden (descendant of s1 via c1)
      // Strict collapse: h is hidden even though c2 is visible
      expect(nodeIds).not.toContain('h')
    })

    it('collapse s1 → s1sp hidden (post-pass: only connected to hidden fs1)', () => {
      const { nodeIds } = computeVisible(ENDOG_NODES, adj, new Set(['s1']))
      expect(nodeIds).not.toContain('s1sp')
    })

    it('c2 visible but has no visible family connection (fc12 is hidden)', () => {
      const { nodeIds, edgeIds } = computeVisible(ENDOG_NODES, adj, new Set(['s1']))
      expect(nodeIds).toContain('c2')
      expect(nodeIds).not.toContain('fc12')
      // Edge c2→fc12 not visible (fc12 is hidden)
      expect(edgeIds).not.toContain('ec2p')
    })
  })
})

// ─── countHiddenDescendants ──────────────────────────────────────────────────

describe('countHiddenDescendants', () => {
  it('counts only person nodes hidden in the descendant subtree', () => {
    const adj = buildAdjacency(MAIN_EDGES)
    const { nodeIds: visible } = computeVisible(MAIN_NODES, adj, new Set(['par']))
    // Descendants of par: foc, ch, gch (3 persons), fp, ff, fc (3 families)
    expect(countHiddenDescendants('par', adj, visible)).toBe(3)
  })

  it('collapsed leaf → 0 descendants', () => {
    const adj = buildAdjacency(MAIN_EDGES)
    const { nodeIds: visible } = computeVisible(MAIN_NODES, adj, new Set(['gch']))
    expect(countHiddenDescendants('gch', adj, visible)).toBe(0)
  })

  it('endogamy: counts persons from collapsed branch (h via s1)', () => {
    const adj = buildAdjacency(ENDOG_EDGES)
    const { nodeIds: visible } = computeVisible(ENDOG_NODES, adj, new Set(['s1']))
    // Descendants of s1: c1 (person), h (person) → 2
    expect(countHiddenDescendants('s1', adj, visible)).toBe(2)
  })
})

// ─── expandToReveal ──────────────────────────────────────────────────────────

describe('expandToReveal', () => {
  it('target itself collapsed → target removed from collapsedIds', () => {
    const adj = buildAdjacency(SIMPLE_EDGES)
    const result = expandToReveal('x', adj, new Set(['x']))
    expect(result.has('x')).toBe(false)
  })

  it('ancestor collapsed → ancestor removed', () => {
    const adj = buildAdjacency(MAIN_EDGES)
    const result = expandToReveal('foc', adj, new Set(['par']))
    expect(result.has('par')).toBe(false)
  })

  it('grandparent collapsed → grandparent removed', () => {
    const adj = buildAdjacency(MAIN_EDGES)
    const result = expandToReveal('gch', adj, new Set(['par']))
    expect(result.has('par')).toBe(false)
  })

  it('non-ancestor collapsed → preserved in result', () => {
    const adj = buildAdjacency(MAIN_EDGES)
    // par is NOT an ancestor of gp1 (gp1 is ancestor of par)
    const result = expandToReveal('gp1', adj, new Set(['par']))
    expect(result.has('par')).toBe(true)
  })

  it('multiple collapses → only ancestors of target removed', () => {
    const adj = buildAdjacency(MAIN_EDGES)
    // Both par and ch collapsed; looking for gch: par is ancestor, ch is ancestor
    const result = expandToReveal('gch', adj, new Set(['par', 'ch']))
    expect(result.has('par')).toBe(false)
    expect(result.has('ch')).toBe(false)
  })

  it('endogamy: removes both collapsed branches to reveal h', () => {
    const adj = buildAdjacency(ENDOG_EDGES)
    const result = expandToReveal('h', adj, new Set(['s1', 's2']))
    expect(result.has('s1')).toBe(false)
    expect(result.has('s2')).toBe(false)
  })

  it('co-parent (married-in spouse) treated as ancestor for reveal', () => {
    // xs (married-in, no parents) is still a parent of fx → collapsing xs hides c
    // expandToReveal(c, ...) should remove xs
    const adj = buildAdjacency(SIMPLE_EDGES)
    const result = expandToReveal('c', adj, new Set(['xs']))
    expect(result.has('xs')).toBe(false)
  })
})
