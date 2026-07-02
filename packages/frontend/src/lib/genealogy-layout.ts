import dagre from 'dagre'

type RawNode = { id: string; type: 'person' | 'family'; position: { x: number; y: number }; data: unknown }
type RawEdge = { id: string; source: string; target: string }

const PERSON_W = 160
const PERSON_H = 80
const FAMILY_W = 16
const FAMILY_H = 16

export function applyDagreLayout<N extends RawNode>(nodes: N[], edges: RawEdge[]): N[] {
  const g = new dagre.graphlib.Graph()
  g.setGraph({ rankdir: 'TB', nodesep: 60, ranksep: 100, marginx: 20, marginy: 20 })
  g.setDefaultEdgeLabel(() => ({}))

  for (const node of nodes) {
    const w = node.type === 'person' ? PERSON_W : FAMILY_W
    const h = node.type === 'person' ? PERSON_H : FAMILY_H
    g.setNode(node.id, { width: w, height: h })
  }
  for (const edge of edges) {
    g.setEdge(edge.source, edge.target)
  }

  dagre.layout(g)

  return nodes.map(node => {
    const pos = g.node(node.id)
    return { ...node, position: { x: pos.x - (node.type === 'person' ? PERSON_W : FAMILY_W) / 2, y: pos.y } }
  })
}
