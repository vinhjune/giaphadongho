import { useEffect, useState, useMemo } from 'react'
import { ReactFlow, Background, Controls, MiniMap } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import AppNav from '../components/layout/AppNav'
import PersonNode from '../components/tree/PersonNode'
import FamilyNode from '../components/tree/FamilyNode'
import { applyDagreLayout } from '../lib/genealogy-layout'
import type { PersonPublic } from '@giapha/shared/types'

type RawNode =
  | { id: string; type: 'person'; data: PersonPublic; position: { x: number; y: number } }
  | { id: string; type: 'family'; data: { id: string }; position: { x: number; y: number } }
type RawEdge = { id: string; source: string; target: string }
type GraphResponse = { nodes: RawNode[]; edges: RawEdge[]; hasEndogamy: boolean }

const nodeTypes = { person: PersonNode, family: FamilyNode }

export default function TreePage() {
  const [graph, setGraph] = useState<GraphResponse | null>(null)
  const [error, setError]   = useState(false)

  useEffect(() => {
    fetch('/api/persons/graph/data')
      .then(r => r.json())
      .then(d => setGraph(d as GraphResponse))
      .catch(() => setError(true))
  }, [])

  const { nodes, edges } = useMemo(() => {
    if (!graph) return { nodes: [], edges: [] }
    const laid = applyDagreLayout(graph.nodes, graph.edges)
    return { nodes: laid, edges: graph.edges }
  }, [graph])

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
    <div className="min-h-screen flex flex-col bg-stone-50">
      <AppNav />
      {graph.hasEndogamy && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-sm text-amber-800 text-center">
          Cây gia phả có hôn nhân cùng dòng họ — một số người xuất hiện ở nhiều nhánh.
        </div>
      )}
      <div className="flex-1" style={{ minHeight: 0 }}>
        <ReactFlow
          nodes={nodes as Parameters<typeof ReactFlow>[0]['nodes']}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.1}
          proOptions={{ hideAttribution: false }}
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>
    </div>
  )
}
