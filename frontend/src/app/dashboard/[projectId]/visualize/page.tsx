'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams } from 'next/navigation'
import ReactFlow, {
  Background, Controls, MiniMap, useNodesState, useEdgesState,
  BackgroundVariant, Panel, NodeProps
} from 'reactflow'
import 'reactflow/dist/style.css'
import { Loader2, Layers, GitBranch, Database, Settings, Box } from 'lucide-react'
import { getArchitecture } from '@/lib/api'
import { useStore } from '@/lib/store'
import type { Architecture } from '@/lib/api'

const NODE_TYPE_ICONS: Record<string, React.ElementType> = {
  api: GitBranch,
  database: Database,
  service: Settings,
  config: Settings,
  module: Box,
  utility: Box,
  middleware: Layers,
}

function CodeNode({ data }: NodeProps) {
  const Icon = NODE_TYPE_ICONS[data.nodeType] || Box
  return (
    <div
      className="px-3 py-2 rounded-xl text-xs max-w-[190px] cursor-pointer transition-all duration-200 hover:scale-[1.03]"
      style={{
        backgroundColor: `${data.color}12`,
        borderColor: `${data.color}45`,
        border: `1px solid ${data.color}45`,
        boxShadow: `0 0 16px ${data.color}18, inset 0 0 0 1px ${data.color}10`,
        backdropFilter: 'blur(8px)',
      }}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3 h-3 flex-shrink-0" style={{ color: data.color }} />
        <span className="font-medium text-white truncate" style={{ fontSize: '11px' }}>{data.label}</span>
      </div>
      {data.symbolCount > 0 && (
        <div className="text-[9px] font-mono" style={{ color: `${data.color}80` }}>{data.symbolCount} symbols</div>
      )}
    </div>
  )
}



const nodeTypes_display = [
  { type: 'api', label: 'API Routes', color: '#60a5fa' },
  { type: 'database', label: 'Database', color: '#34d399' },
  { type: 'service', label: 'Services', color: '#a78bfa' },
  { type: 'module', label: 'Modules', color: '#7c6fff' },
  { type: 'utility', label: 'Utilities', color: '#6b7280' },
]

export default function VisualizePage() {
  const params = useParams()
  const projectId = params.projectId as string
  const { architectures, setArchitecture } = useStore()

  const [arch, setLocalArch] = useState<Architecture | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedNode, setSelectedNode] = useState<any>(null)
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [activeFilter, setActiveFilter] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        let data = architectures[projectId]
        if (!data) {
          data = await getArchitecture(projectId)
          setArchitecture(projectId, data)
        }
        setLocalArch(data)
        if (data?.graph) {
          setNodes(data.graph.nodes as any[])
          setEdges(data.graph.edges as any[])
        }
      } catch (err) {
        console.error('Failed to load architecture:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [projectId, architectures, setArchitecture, setNodes, setEdges])

  const filterByType = useCallback((type: string | null) => {
    setActiveFilter(type)
    if (!arch?.graph) return
    if (!type) {
      setNodes(arch.graph.nodes as any[])
      setEdges(arch.graph.edges as any[])
      return
    }
    const filteredNodes = arch.graph.nodes.filter(n => n.data.nodeType === type)
    const nodeIds = new Set(filteredNodes.map(n => n.id))
    const filteredEdges = arch.graph.edges.filter(
      e => nodeIds.has(e.source) && nodeIds.has(e.target)
    )
    setNodes(filteredNodes as any[])
    setEdges(filteredEdges as any[])
  }, [arch, setNodes, setEdges])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div
          className="w-8 h-8 rounded-full border-2 animate-spin"
          style={{ borderColor: 'rgba(124,111,255,0.3)', borderTopColor: '#7c6fff' }}
        />
      </div>
    )
  }

  const glassPanel = {
    background: 'rgba(8,8,16,0.85)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '16px',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    padding: '14px',
  }

  const nodeTypes = useMemo(() => ({ codeNode: CodeNode }), [])

  return (
    <div className="flex h-full">
      {/* Graph */}
      <div className="flex-1" style={{ height: 'calc(100vh - 0px)' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          onNodeClick={(_, node) => setSelectedNode(node)}
          fitView
          fitViewOptions={{ padding: 0.25 }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={24}
            size={1}
            color="rgba(255,255,255,0.04)"
          />
          <Controls />
          <MiniMap
            nodeColor={n => (n.data as any)?.color || '#7c6fff'}
          />

          {/* Filter Panel */}
          <Panel position="top-left" className="m-4">
            <div style={glassPanel}>
              <p
                className="text-[10px] uppercase tracking-widest font-medium mb-2.5"
                style={{ color: '#3d3e52' }}
              >
                Filter
              </p>
              <div className="space-y-1">
                <button
                  onClick={() => filterByType(null)}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-all duration-150"
                  style={{
                    background: !activeFilter ? 'rgba(255,255,255,0.08)' : 'transparent',
                    color: !activeFilter ? '#e0e0ea' : '#5a5b70',
                  }}
                  onMouseEnter={e => { if (activeFilter) (e.currentTarget as HTMLElement).style.color = '#a0a0b0' }}
                  onMouseLeave={e => { if (activeFilter) (e.currentTarget as HTMLElement).style.color = '#5a5b70' }}
                >
                  All ({arch?.graph?.nodes.length || 0})
                </button>
                {nodeTypes_display.map(t => (
                  <button
                    key={t.type}
                    onClick={() => filterByType(activeFilter === t.type ? null : t.type)}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-2 transition-all duration-150"
                    style={{
                      background: activeFilter === t.type ? `${t.color}15` : 'transparent',
                      color: activeFilter === t.type ? t.color : '#5a5b70',
                    }}
                    onMouseEnter={e => { if (activeFilter !== t.type) (e.currentTarget as HTMLElement).style.color = '#a0a0b0' }}
                    onMouseLeave={e => { if (activeFilter !== t.type) (e.currentTarget as HTMLElement).style.color = '#5a5b70' }}
                  >
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: t.color }} />
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </Panel>

          {/* Stats Panel */}
          <Panel position="top-right" className="m-4">
            <div style={{ ...glassPanel, padding: '12px 16px' }}>
              <p className="text-[10px] uppercase tracking-widest font-medium mb-2" style={{ color: '#3d3e52' }}>Graph</p>
              <div className="space-y-1">
                <p className="text-xs" style={{ color: '#8B8C9E' }}>
                  <span className="font-semibold" style={{ color: '#e0e0ea' }}>{arch?.graph?.metrics?.node_count || 0}</span> nodes
                </p>
                <p className="text-xs" style={{ color: '#8B8C9E' }}>
                  <span className="font-semibold" style={{ color: '#e0e0ea' }}>{arch?.graph?.metrics?.edge_count || 0}</span> edges
                </p>
              </div>
            </div>
          </Panel>
        </ReactFlow>
      </div>

      {/* Node detail sidebar */}
      {selectedNode && (
        <div
          className="w-72 overflow-y-auto flex flex-col animate-slide-in-right"
          style={{
            background: 'rgba(8,8,16,0.95)',
            borderLeft: '1px solid rgba(255,255,255,0.07)',
            backdropFilter: 'blur(24px)',
          }}
        >
          <div
            className="flex items-center justify-between px-4 py-3.5"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
          >
            <h3 className="font-semibold text-sm" style={{ color: '#e0e0ea' }}>Node Details</h3>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-lg leading-none transition-colors w-7 h-7 flex items-center justify-center rounded-lg"
              style={{ color: '#4a4b60', background: 'rgba(255,255,255,0.04)' }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.color = '#e0e0ea'
                  ; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.color = '#4a4b60'
                  ; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'
              }}
            >
              ×
            </button>
          </div>

          <div className="p-4 space-y-3 flex-1">
            <div
              className="p-3 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <p className="text-[10px] uppercase tracking-widest font-medium mb-1.5" style={{ color: '#3d3e52' }}>File</p>
              <p className="text-xs font-mono break-all leading-relaxed" style={{ color: '#a0a0b0' }}>
                {selectedNode.data?.filePath || selectedNode.data?.label}
              </p>
            </div>

            <div
              className="p-3 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <p className="text-[10px] uppercase tracking-widest font-medium mb-1.5" style={{ color: '#3d3e52' }}>Type</p>
              <span
                className="inline-block px-2.5 py-1 rounded-full text-xs font-medium capitalize"
                style={{
                  backgroundColor: `${selectedNode.data?.color}18`,
                  color: selectedNode.data?.color,
                  border: `1px solid ${selectedNode.data?.color}30`,
                }}
              >
                {selectedNode.data?.nodeType}
              </span>
            </div>

            {selectedNode.data?.symbolCount > 0 && (
              <div
                className="p-3 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <p className="text-[10px] uppercase tracking-widest font-medium mb-1.5" style={{ color: '#3d3e52' }}>Symbols</p>
                <p className="text-sm font-semibold" style={{ color: '#e0e0ea' }}>{selectedNode.data.symbolCount}</p>
              </div>
            )}

            {arch?.layers && (
              <div className="mt-2">
                <p className="text-[10px] uppercase tracking-widest font-medium mb-2.5 px-1" style={{ color: '#3d3e52' }}>
                  Architecture Layers
                </p>
                <div className="space-y-2">
                  {arch.layers.map((layer: any) => (
                    <div
                      key={layer.name}
                      className="p-3 rounded-xl"
                      style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <p className="text-xs font-medium mb-0.5" style={{ color: '#c0c0d0' }}>{layer.name}</p>
                      <p className="text-xs leading-relaxed" style={{ color: '#4a4b60' }}>{layer.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
