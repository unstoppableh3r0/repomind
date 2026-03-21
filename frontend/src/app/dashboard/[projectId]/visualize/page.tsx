'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  NodeProps,
  Panel,
  Position,
  useEdgesState,
  useNodesState,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { Box, Database, GitBranch, Layers, Loader2, Settings, Sparkles } from 'lucide-react'
import { getArchitecture } from '@/lib/api'
import { useStore } from '@/lib/store'
import type { Architecture } from '@/lib/api'

const TYPE_ICONS: Record<string, React.ElementType> = {
  api: GitBranch,
  database: Database,
  service: Settings,
  config: Settings,
  module: Box,
  utility: Box,
  middleware: Layers,
}

const FILTERS = [
  { key: 'api', label: 'API', color: '#60a5fa' },
  { key: 'database', label: 'Database', color: '#34d399' },
  { key: 'service', label: 'Service', color: '#a78bfa' },
  { key: 'module', label: 'Module', color: '#7c6fff' },
  { key: 'utility', label: 'Utility', color: '#9ca3af' },
]

function CodeNode({ data }: NodeProps) {
  const Icon = TYPE_ICONS[data.nodeType] || Box

  return (
    <div
      className="rounded-xl border px-3 py-2 text-xs min-w-[150px]"
      style={{
        borderColor: `${data.color}66`,
        background: 'rgba(10,10,22,0.9)',
        boxShadow: `0 0 18px ${data.color}44`,
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: '#7c6fff' }} />
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3 h-3" style={{ color: data.color }} />
        <span className="truncate text-[#ececf8] font-medium">{data.label}</span>
      </div>
      <div className="text-[10px] text-[#80809a]">{data.symbolCount || 0} symbols</div>
      <Handle type="source" position={Position.Bottom} style={{ background: '#7c6fff' }} />
    </div>
  )
}

export default function VisualizePage() {
  const params = useParams()
  const projectId = params.projectId as string
  const { setArchitecture } = useStore()

  const [arch, setArch] = useState<Architecture | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedNode, setSelectedNode] = useState<any>(null)
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getArchitecture(projectId)
        setArch(data)
        setArchitecture(projectId, data)
        setNodes((data.graph?.nodes || []) as any[])
        setEdges((data.graph?.edges || []) as any[])
      } catch {
        setArch(null)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [projectId, setArchitecture, setNodes, setEdges])

  function applyFilter(next: string | null) {
    setActiveFilter(next)
    if (!arch?.graph) return

    if (!next) {
      setNodes(arch.graph.nodes as any[])
      setEdges(arch.graph.edges as any[])
      return
    }

    const filteredNodes = arch.graph.nodes.filter((n) => n.data.nodeType === next)
    const ids = new Set(filteredNodes.map((n) => n.id))
    const filteredEdges = arch.graph.edges.filter((e) => ids.has(e.source) && ids.has(e.target))

    setNodes(filteredNodes as any[])
    setEdges(filteredEdges as any[])
  }

  const nodeTypes = useMemo(() => ({ codeNode: CodeNode }), [])

  if (loading) {
    return (
      <div className="h-full w-full grid place-items-center">
        <Loader2 className="w-7 h-7 animate-spin text-[#9a8eff]" />
      </div>
    )
  }

  return (
    <div className="h-full w-full grid" style={{ gridTemplateRows: 'auto minmax(0,1fr)' }}>
      <header className="px-6 py-4 border-b border-white/10">
        <div className="rm-page-badge mb-2">
          <Sparkles className="w-3 h-3" />
          Analysis View
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-[#ececf8]">Architecture Visualization</h1>
            <p className="text-xs text-[#7a7a92]">Interactive dependency graph</p>
          </div>
          <div className="text-xs rounded-lg px-3 py-1.5 border border-white/15 bg-white/5 text-[#b2b2c6]">
            {(arch?.graph?.metrics?.node_count || 0).toString()} nodes • {(arch?.graph?.metrics?.edge_count || 0).toString()} edges
          </div>
        </div>
      </header>

      <div className="min-h-0 flex">
        <div className="flex-1 min-w-0">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={(_, node) => setSelectedNode(node)}
            fitView
          >
            <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="rgba(255,255,255,0.08)" />
            <Controls />

            <Panel position="top-left" className="m-4">
              <div className="rm-glass-panel p-3 w-52">
                <p className="text-[11px] text-[#7b7b94] mb-2">Filter</p>
                <div className="space-y-1.5">
                  <button
                    className="w-full text-left text-xs rounded-lg px-2.5 py-1.5 border"
                    style={{
                      borderColor: activeFilter ? 'rgba(255,255,255,0.1)' : 'rgba(124,111,255,.45)',
                      background: activeFilter ? 'transparent' : 'rgba(124,111,255,.14)',
                      color: activeFilter ? '#a6a6bc' : '#cfbfff',
                    }}
                    onClick={() => applyFilter(null)}
                  >
                    All
                  </button>
                  {FILTERS.map((f) => (
                    <button
                      key={f.key}
                      className="w-full text-left text-xs rounded-lg px-2.5 py-1.5 border"
                      style={{
                        borderColor: activeFilter === f.key ? `${f.color}88` : 'rgba(255,255,255,0.1)',
                        background: activeFilter === f.key ? `${f.color}22` : 'transparent',
                        color: activeFilter === f.key ? f.color : '#a6a6bc',
                      }}
                      onClick={() => applyFilter(activeFilter === f.key ? null : f.key)}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </Panel>
          </ReactFlow>
        </div>

        {selectedNode && (
          <aside className="w-80 border-l border-white/10 bg-[#0a0a15]/90 backdrop-blur-xl overflow-y-auto">
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#ececf8]">Node Details</h3>
              <button onClick={() => setSelectedNode(null)} className="text-[#777792] hover:text-white">
                ×
              </button>
            </div>
            <div className="p-4 space-y-3">
              <InfoCard label="File" value={selectedNode.data?.filePath || selectedNode.data?.label} mono />
              <InfoCard label="Type" value={selectedNode.data?.nodeType || 'unknown'} />
              <InfoCard label="Symbols" value={String(selectedNode.data?.symbolCount || 0)} />
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}

function InfoCard({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-[0.1em] text-[#676783] mb-1">{label}</p>
      <p className={mono ? 'text-xs text-[#c4c4d6] font-mono break-all' : 'text-sm text-[#d7d7e6]'}>{value}</p>
    </div>
  )
}
