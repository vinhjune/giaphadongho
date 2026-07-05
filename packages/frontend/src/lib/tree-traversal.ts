export type GraphEdge = { id: string; source: string; target: string }
export type GraphNodeRef = { id: string; type: 'person' | 'family' }

export type Adjacency = {
  /** nodeId → source ids (person's incoming = family ids; family's incoming = parent person ids) */
  incomingOf: Map<string, string[]>
  /** nodeId → target ids (person's outgoing = family ids; family's outgoing = child person ids) */
  outgoingOf: Map<string, string[]>
  /** `${source}->${target}` → edge id; same-pair duplicates: last wins (harmless, documented) */
  edgeByPair: Map<string, string>
}

export function buildAdjacency(edges: GraphEdge[]): Adjacency {
  const incomingOf = new Map<string, string[]>()
  const outgoingOf = new Map<string, string[]>()
  const edgeByPair = new Map<string, string>()

  for (const edge of edges) {
    if (!outgoingOf.has(edge.source)) outgoingOf.set(edge.source, [])
    if (!incomingOf.has(edge.target)) incomingOf.set(edge.target, [])
    outgoingOf.get(edge.source)!.push(edge.target)
    incomingOf.get(edge.target)!.push(edge.source)
    edgeByPair.set(`${edge.source}->${edge.target}`, edge.id)
  }

  return { incomingOf, outgoingOf, edgeByPair }
}

export type HighlightSets = { nodeIds: Set<string>; edgeIds: Set<string> }

/**
 * Computes ancestor/descendant highlight sets for a focused person in a bipartite genealogy graph.
 *
 * One person-generation = person→family→person (personDepth increments only on family→person hop).
 * Two independent BFS traversals (up / down) with separate visited sets (endogamy-safe).
 * Spouse rule: every family node in the highlight includes ALL its parent persons.
 * No dangling boundary family nodes.
 *
 * Pass `visibleAdj` (adjacency of currently visible edges) so depth counts follow visible paths.
 */
export function computeHighlight(
  focusId: string,
  adj: Adjacency,
  ancestorDepth: number,
  descendantDepth: number,
): HighlightSets {
  const nodeIds = new Set<string>()
  const edgeIds = new Set<string>()

  function addEdge(source: string, target: string) {
    const eid = adj.edgeByPair.get(`${source}->${target}`)
    if (eid) edgeIds.add(eid)
  }

  // ── UP traversal: find ancestors (and their co-parents via bipartite inclusion) ──
  {
    type Q = { id: string; isFamily: boolean; depth: number }
    const queue: Q[] = [{ id: focusId, isFamily: false, depth: 0 }]
    const visited = new Set<string>()

    while (queue.length > 0) {
      const item = queue.shift()!
      if (visited.has(item.id)) continue
      visited.add(item.id)
      nodeIds.add(item.id)

      if (!item.isFamily) {
        // Person: traverse to parent families if depth allows
        if (item.depth < ancestorDepth) {
          for (const famId of adj.incomingOf.get(item.id) ?? []) {
            addEdge(famId, item.id) // family→person edge
            if (!visited.has(famId)) queue.push({ id: famId, isFamily: true, depth: item.depth })
          }
        }
      } else {
        // Family: traverse ALL parent persons (includes both co-parents); increment depth
        for (const parentId of adj.incomingOf.get(item.id) ?? []) {
          addEdge(parentId, item.id) // person→family edge
          if (!visited.has(parentId)) queue.push({ id: parentId, isFamily: false, depth: item.depth + 1 })
        }
      }
    }
  }

  // ── DOWN traversal: find descendants + spouses (spouse rule on every family node) ──
  {
    type Q = { id: string; isFamily: boolean; depth: number }
    const queue: Q[] = [{ id: focusId, isFamily: false, depth: 0 }]
    const visited = new Set<string>()

    while (queue.length > 0) {
      const item = queue.shift()!
      if (visited.has(item.id)) continue
      visited.add(item.id)
      nodeIds.add(item.id)

      if (!item.isFamily) {
        // Person: traverse to child families if depth allows
        if (item.depth < descendantDepth) {
          for (const famId of adj.outgoingOf.get(item.id) ?? []) {
            addEdge(item.id, famId) // person→family edge
            if (!visited.has(famId)) queue.push({ id: famId, isFamily: true, depth: item.depth })
          }
        }
      } else {
        // Family: traverse children (increment depth) + include all co-parents (spouse rule)
        for (const childId of adj.outgoingOf.get(item.id) ?? []) {
          addEdge(item.id, childId) // family→person edge
          if (!visited.has(childId)) queue.push({ id: childId, isFamily: false, depth: item.depth + 1 })
        }
        // Spouse rule: include ALL parent persons without traversing their own lineage
        for (const parentId of adj.incomingOf.get(item.id) ?? []) {
          addEdge(parentId, item.id) // person→family edge
          if (!visited.has(parentId)) {
            nodeIds.add(parentId)
            visited.add(parentId) // prevent further traversal of spouse's relationships
          }
        }
      }
    }
  }

  return { nodeIds, edgeIds }
}

/**
 * Computes visible nodes/edges after applying strict branch collapse.
 *
 * Strict semantics (user decision): collapsing X hides ALL of X's descendants,
 * even if an endogamous descendant is reachable via a second non-collapsed path.
 * No endogamy rescue. Documented behavior, fixture-pinned.
 *
 * Invariant: computeVisible(nodes, adj, ∅) === all nodes/edges.
 */
export function computeVisible(
  nodes: GraphNodeRef[],
  adj: Adjacency,
  collapsedIds: ReadonlySet<string>,
): { nodeIds: Set<string>; edgeIds: Set<string> } {
  // Fast path: nothing collapsed → all visible
  if (collapsedIds.size === 0) {
    return {
      nodeIds: new Set(nodes.map(n => n.id)),
      edgeIds: new Set(adj.edgeByPair.values()),
    }
  }

  // Step 1: Strict down-BFS from each collapsed person to collect hidden descendants.
  // Collapsed persons themselves stay visible (they render as badge nodes).
  const hidden = new Set<string>()
  for (const personId of collapsedIds) {
    const queue: string[] = [...(adj.outgoingOf.get(personId) ?? [])]
    while (queue.length > 0) {
      const id = queue.shift()!
      if (hidden.has(id)) continue
      hidden.add(id)
      for (const nextId of adj.outgoingOf.get(id) ?? []) {
        if (!hidden.has(nextId)) queue.push(nextId)
      }
    }
  }

  // Step 2: Floating-spouse post-pass.
  // Hide a non-collapsed person whose EVERY incident family edge leads to a hidden node.
  // (Catches married-in spouses with no other visible connections.)
  for (const node of nodes) {
    if (node.type !== 'person' || hidden.has(node.id) || collapsedIds.has(node.id)) continue
    const incident = [
      ...(adj.incomingOf.get(node.id) ?? []), // family nodes this person is a child of
      ...(adj.outgoingOf.get(node.id) ?? []), // family nodes this person is a parent of
    ]
    if (incident.length > 0 && incident.every(nid => hidden.has(nid))) {
      hidden.add(node.id)
    }
  }

  // Step 3: Visible node set (persons with 0 edges stay visible)
  const visibleNodeIds = new Set(nodes.filter(n => !hidden.has(n.id)).map(n => n.id))

  // Step 4: Visible edges = both endpoints visible AND source is not a collapsed person
  const visibleEdgeIds = new Set<string>()
  for (const [pair, eid] of adj.edgeByPair) {
    const arrow = pair.indexOf('->')
    const source = pair.slice(0, arrow)
    const target = pair.slice(arrow + 2)
    if (visibleNodeIds.has(source) && visibleNodeIds.has(target) && !collapsedIds.has(source)) {
      visibleEdgeIds.add(eid)
    }
  }

  return { nodeIds: visibleNodeIds, edgeIds: visibleEdgeIds }
}

/**
 * Counts person nodes that are descendants of personId AND currently hidden.
 * Badge unit: shows how many people are hidden behind a collapsed node.
 * Uses two-hop down-BFS (person→family→person) so only person nodes are counted.
 */
export function countHiddenDescendants(
  personId: string,
  adj: Adjacency,
  visibleNodeIds: ReadonlySet<string>,
): number {
  let count = 0
  const visitedPersons = new Set<string>()
  const visitedFamilies = new Set<string>()
  const queue: string[] = [personId]

  while (queue.length > 0) {
    const pid = queue.shift()!
    if (visitedPersons.has(pid)) continue
    visitedPersons.add(pid)

    for (const famId of adj.outgoingOf.get(pid) ?? []) {
      if (visitedFamilies.has(famId)) continue
      visitedFamilies.add(famId)

      for (const childId of adj.outgoingOf.get(famId) ?? []) {
        if (!visitedPersons.has(childId)) {
          if (!visibleNodeIds.has(childId)) count++
          queue.push(childId)
        }
      }
    }
  }

  return count
}

/**
 * Returns collapsedIds with personId ITSELF and all collapsed ancestors of personId removed.
 * Guarantees personId is visible after the returned set is applied.
 *
 * Uses two-hop UP-BFS (person→incomingOf→family→incomingOf→parent-person) to collect
 * all persons whose collapse would hide personId (including married-in co-parents).
 *
 * Fixture: expandToReveal(X, adj, {X}) → {} (the person itself is always removed).
 */
export function expandToReveal(
  personId: string,
  adj: Adjacency,
  collapsedIds: ReadonlySet<string>,
): Set<string> {
  const personAncestors = new Set<string>()
  personAncestors.add(personId)

  const personQueue: string[] = [personId]
  const visitedPersons = new Set<string>()
  const visitedFamilies = new Set<string>()

  while (personQueue.length > 0) {
    const pid = personQueue.shift()!
    if (visitedPersons.has(pid)) continue
    visitedPersons.add(pid)

    // Find families where this person is a CHILD (their parent families)
    for (const famId of adj.incomingOf.get(pid) ?? []) {
      if (visitedFamilies.has(famId)) continue
      visitedFamilies.add(famId)

      // Find all parent persons of this family (both co-parents)
      for (const parentId of adj.incomingOf.get(famId) ?? []) {
        personAncestors.add(parentId)
        if (!visitedPersons.has(parentId)) personQueue.push(parentId)
      }
    }
  }

  return new Set([...collapsedIds].filter(id => !personAncestors.has(id)))
}
