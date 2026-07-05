import { useEffect, useState, useMemo, useCallback } from 'react'
import { ReactFlow, Background, Controls, MiniMap, Panel, useReactFlow } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import AppNav from '../components/layout/AppNav'
import PersonNode from '../components/tree/PersonNode'
import FamilyNode from '../components/tree/FamilyNode'
import PersonDetailModal from '../components/PersonDetailModal'
import TreeSearchPanel from '../components/tree/TreeSearchPanel'
import GenerationControlsPanel from '../components/tree/GenerationControlsPanel'
import { applyDagreLayout, PERSON_W, PERSON_H } from '../lib/genealogy-layout'
import { buildAdjacency, computeHighlight, computeVisible, countHiddenDescendants, expandToReveal } from '../lib/tree-traversal'
import type { GraphNodeRef } from '../lib/tree-traversal'
import type { PersonNodeData } from '../components/tree/PersonNode'
import type { PersonPublic } from '@giapha/shared/types'

type RawNode =
  | { id: string; type: 'person'; data: PersonPublic; position: { x: number; y: number } }
  | { id: string; type: 'family'; data: { id: string }; position: { x: number; y: number } }
type RawEdge = { id: string; source: string; target: string }
type GraphResponse = { nodes: RawNode[]; edges: RawEdge[]; hasEndogamy: boolean }

const EDGE_HIGHLIGHTED = { stroke: '#f59e0b', strokeWidth: 2 }
const EDGE_DIMMED = { stroke: '#d6d3d1', strokeWidth: 1, opacity: 0.3 }

const nodeTypes = { person: PersonNode, family: FamilyNode }

/** Inline child of <ReactFlow> — centers viewport on the focused node after layout. */
function CenterOnFocus({ focusPersonId, nodes }: { focusPersonId: string | null; nodes: RawNode[] }) {
  const { setCenter } = useReactFlow()
  const focusNode = focusPersonId ? nodes.find(n => n.id === focusPersonId) : null
  const fx = focusNode?.position.x
  const fy = focusNode?.position.y
  useEffect(() => {
    if (fx == null || fy == null) return
    setCenter(fx + PERSON_W / 2, fy + PERSON_H / 2, { zoom: 1, duration: 600 })
  }, [focusPersonId, fx, fy, setCenter])
  return null
}

export default function TreePage() {
  const [graph, setGraph]                     = useState<GraphResponse | null>(null)
  const [error, setError]                     = useState(false)
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null)
  const [focusPersonId, setFocusPersonId]     = useState<string | null>(null)
  const [ancestorDepth, setAncestorDepth]     = useState(2)
  const [descendantDepth, setDescendantDepth] = useState(2)
  const [collapsedIds, setCollapsedIds]       = useState<ReadonlySet<string>>(new Set())

  useEffect(() => {
    fetch('/api/persons/graph/data')
      .then(r => r.json())
      .then(d => setGraph(d as GraphResponse))
      .catch(() => setError(true))
  }, [])

  // Full adjacency (over all graph edges — used for collapse/expand operations)
  const adjacency = useMemo(
    () => buildAdjacency(graph?.edges ?? []),
    [graph],
  )

  // Persons for the search panel
  const persons = useMemo(
    () => graph?.nodes.filter(n => n.type === 'person').map(n => n.data as PersonPublic) ?? [],
    [graph],
  )

  // Visible subgraph (collapseIds applied)
  const graphNodeRefs = useMemo<GraphNodeRef[]>(
    () => graph?.nodes.map(n => ({ id: n.id, type: n.type as 'person' | 'family' })) ?? [],
    [graph],
  )
  const visible = useMemo(
    () => computeVisible(graphNodeRefs, adjacency, collapsedIds),
    [graphNodeRefs, adjacency, collapsedIds],
  )

  // Layout on visible subset
  const visibleRawNodes = useMemo(
    () => graph?.nodes.filter(n => visible.nodeIds.has(n.id)) ?? [],
    [graph, visible.nodeIds],
  )
  const visibleRawEdges = useMemo(
    () => graph?.edges.filter(e => visible.edgeIds.has(e.id)) ?? [],
    [graph, visible.edgeIds],
  )
  const laidOutNodes = useMemo(
    () => applyDagreLayout(visibleRawNodes, visibleRawEdges),
    [visibleRawNodes, visibleRawEdges],
  )

  // Adjacency of visible edges (used for highlight depth counting)
  const visibleAdj = useMemo(() => buildAdjacency(visibleRawEdges), [visibleRawEdges])

  // Highlight sets (only when focus is set)
  const highlight = useMemo(() => {
    if (!focusPersonId) return null
    return computeHighlight(focusPersonId, visibleAdj, ancestorDepth, descendantDepth)
  }, [focusPersonId, visibleAdj, ancestorDepth, descendantDepth])

  // Auto-clear focus when the focus node is no longer visible (e.g. hidden by collapse)
  useEffect(() => {
    if (focusPersonId && !visible.nodeIds.has(focusPersonId)) {
      setFocusPersonId(null)
    }
  }, [focusPersonId, visible.nodeIds])

  const handleToggleCollapse = useCallback((id: string) => {
    setCollapsedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  // Decorated nodes: highlight flags + collapse flags + stable callback
  const decoratedNodes = useMemo(() => {
    return laidOutNodes.map(node => {
      const inHighlight = highlight ? highlight.nodeIds.has(node.id) : true
      const dimmed = !inHighlight
      if (node.type === 'person') {
        const isCollapsed = collapsedIds.has(node.id)
        const hasChildren = (adjacency.outgoingOf.get(node.id)?.length ?? 0) > 0
        const hiddenCount = isCollapsed
          ? countHiddenDescendants(node.id, adjacency, visible.nodeIds)
          : 0
        const personData: PersonNodeData = {
          ...(node.data as PersonNodeData),
          dimmed,
          isFocus: node.id === focusPersonId,
          hasChildren,
          isCollapsed,
          hiddenCount,
          onToggleCollapse: handleToggleCollapse,
        }
        return { ...node, data: personData }
      }
      return { ...node, data: { ...(node.data as object), dimmed } }
    })
  }, [laidOutNodes, highlight, focusPersonId, collapsedIds, adjacency, visible.nodeIds, handleToggleCollapse])

  // Decorated edges
  const decoratedEdges = useMemo(() => {
    return visibleRawEdges.map(edge => {
      if (!highlight) return edge
      const inHighlight = highlight.edgeIds.has(edge.id)
      return { ...edge, style: inHighlight ? EDGE_HIGHLIGHTED : EDGE_DIMMED }
    })
  }, [visibleRawEdges, highlight])

  // Focus person name for the controls panel
  const focusPerson = useMemo(
    () => persons.find(p => p.id === focusPersonId) ?? null,
    [persons, focusPersonId],
  )

  const handleSearchSelect = useCallback(
    (id: string) => {
      // Auto-expand any collapsed ancestor so the target becomes visible
      setCollapsedIds(prev => expandToReveal(id, adjacency, prev))
      setFocusPersonId(id)
    },
    [adjacency],
  )

  if (error) return (
    <div className="min-h-screen bg-stone-50">
      <AppNav />
      <div className="flex items-center justify-center h-[80vh] text-stone-500">Không thể tải sơ đồ.</div>
    </div>
  )

  if (!graph) return (
    <div className="min-h-screen bg-stone-50">
      <AppNav />
      <div className="flex items-center justify-center h-[80vh] text-stone-400">Đang tải…</div>
    </div>
  )

  return (
    <div className="h-screen flex flex-col bg-stone-50">
      <AppNav />
      {graph.hasEndogamy && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-sm text-amber-800 text-center">
          Cây gia phả có hôn nhân cùng dòng họ — một số người xuất hiện ở nhiều nhánh.
        </div>
      )}
      <div className="flex-1" style={{ minHeight: 0 }}>
        <ReactFlow
          nodes={decoratedNodes as Parameters<typeof ReactFlow>[0]['nodes']}
          edges={decoratedEdges}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.1}
          proOptions={{ hideAttribution: false }}
          onNodeDoubleClick={(_event, node) => {
            if (node.type === 'person') setSelectedPersonId(node.id)
          }}
        >
          <Background />
          <Controls />
          <MiniMap />
          <Panel position="top-left">
            <TreeSearchPanel persons={persons} onSelect={handleSearchSelect} />
          </Panel>
          {focusPerson && (
            <Panel position="top-right">
              <GenerationControlsPanel
                focusName={focusPerson.name}
                ancestorDepth={ancestorDepth}
                descendantDepth={descendantDepth}
                onAncestorChange={d => setAncestorDepth(Math.max(0, Math.min(9, d)))}
                onDescendantChange={d => setDescendantDepth(Math.max(0, Math.min(9, d)))}
                onClear={() => setFocusPersonId(null)}
              />
            </Panel>
          )}
          <CenterOnFocus focusPersonId={focusPersonId} nodes={laidOutNodes as RawNode[]} />
        </ReactFlow>
      </div>
      <PersonDetailModal personId={selectedPersonId} onClose={() => setSelectedPersonId(null)} />
    </div>
  )
}
