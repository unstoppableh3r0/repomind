'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useParams } from 'next/navigation'
import ReactFlow, {
  Background, Controls, MiniMap, useNodesState, useEdgesState,
  BackgroundVariant, Panel, NodeProps, Handle, Position, useReactFlow
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
  console.log('🎨 Rendering CodeNode:', data.label)
  return (
    <div
      className="px-3 py-2 rounded-xl text-xs max-w-[190px] cursor-pointer transition-all duration-200 hover:scale-[1.03]"
      style={{
        backgroundColor: data.color || '#a78bfa',
        border: `2px solid ${data.color || '#a78bfa'}`,
        color: '#ffffff',
        boxShadow: `0 0 16px ${data.color}40`,
        zIndex: 10
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: '#7c6fff' }} />
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3 h-3 flex-shrink-0" style={{ color: '#ffffff' }} />
        <span className="font-medium text-white truncate" style={{ fontSize: '11px' }}>{data.label}</span>
      </div>
      {data.symbolCount > 0 && (
        <div className="text-[9px] font-mono" style={{ color: '#ffffff' }}>{data.symbolCount} symbols</div>
      )}
      <Handle type="source" position={Position.Bottom} style={{ background: '#7c6fff' }} />
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
  const reactFlowWrapper = useRef<any>(null)

  const [arch, setLocalArch] = useState<Architecture | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedNode, setSelectedNode] = useState<any>(null)
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [activeFilter, setActiveFilter] = useState<string | null>(null)

  useEffect(() => {
    console.log('🎨 ReactFlow rendering with', nodes.length, 'nodes and', edges.length, 'edges')
    if (nodes.length > 0) {
      console.log('  First node:', { 
        id: nodes[0].id, 
        position: nodes[0].position, 
        width: nodes[0].width, 
        height: nodes[0].height,
        type: nodes[0].type
      })
      console.log('  All node positions:')
      nodes.forEach((n, i) => {
        console.log(`    ${i}: ${n.id} at (${n.position.x}, ${n.position.y})`)
      })
    }
  }, [nodes, edges])

  useEffect(() => {
    const load = async () => {
      try {
        console.log('📊 Loading architecture for project:', projectId)
        // Always fetch fresh data (ignore cache)
        const data = await getArchitecture(projectId)
        console.log('✓ Architecture data received:', data)
        console.log('  Nodes:', data?.graph?.nodes?.length || 0)
        console.log('  Edges:', data?.graph?.edges?.length || 0)
        if (data?.graph?.nodes) {
          console.log('  First node type:', data.graph.nodes[0]?.type)
        }
        setArchitecture(projectId, data)
        setLocalArch(data)
        if (data?.graph) {
          console.log('📍 Setting nodes and edges in ReactFlow')
          setNodes(data.graph.nodes as any[])
          setEdges(data.graph.edges as any[])
        }
      } catch (err) {
        console.error('❌ Failed to load architecture:', err)
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

  const nodeTypes = useMemo(() => {
    console.log('📝 Registering custom node types: codeNode')
    return { codeNode: CodeNode }
  }, [])

  // Calculate viewport to show all nodes
  const [initialViewport, setInitialViewport] = useState({ x: 0, y: 0, zoom: 1 })
  const graphContainerRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    if (nodes.length > 0 && graphContainerRef.current) {
      // Get actual canvas dimensions from container
      const rect = graphContainerRef.current.getBoundingClientRect()
      const canvasWidth = rect.width || 1200
      const canvasHeight = rect.height || 600
      
      console.log('📐 Container dimensions:', { canvasWidth, canvasHeight })
      
      // Calculate bounds (with padding) to fit all nodes
      const padding = 100
      const minX = Math.min(...nodes.map(n => n.position?.x || 0)) - padding
      const maxX = Math.max(...nodes.map(n => n.position?.x || 0)) + (nodes[0]?.width || 190) + padding
      const minY = Math.min(...nodes.map(n => n.position?.y || 0)) - padding
      const maxY = Math.max(...nodes.map(n => n.position?.y || 0)) + (nodes[0]?.height || 60) + padding
      
      const boundingWidth = maxX - minX
      const boundingHeight = maxY - minY
      
      // Calculate zoom to fit all nodes in canvas with margin
      const zoom = Math.min(
        (canvasWidth - 40) / Math.max(boundingWidth, 1),
        (canvasHeight - 40) / Math.max(boundingHeight, 1),
        1.5
      )
      
      // Center the viewport on the bounding box
      const x = (canvasWidth - boundingWidth * zoom) / 2 - minX * zoom
      const y = (canvasHeight - boundingHeight * zoom) / 2 - minY * zoom
      
      console.log('📐 Viewport calculation:')
      console.log('   Bounds:', { minX, maxX, minY, maxY })
      console.log('   Bounding box:', { width: boundingWidth, height: boundingHeight })
      console.log('   Zoom:', zoom)
      console.log('   Viewport:', { x, y, zoom })
      
      setInitialViewport({ x, y, zoom })
    }
  }, [nodes])

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

  return (
    <div className="flex flex-col h-full relative z-10" style={{ height: 'calc(100vh - 0px)' }}>
      {/* ── Header / Breadcrumbs ── */}
      <header 
        className="px-6 py-4 flex items-center justify-between"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(8,8,16,0.4)', backdropFilter: 'blur(10px)' }}
      >
        <div className="flex items-center gap-2 text-xs font-medium">
          <span style={{ color: '#4a4b60' }}>Dashboard</span>
          <span style={{ color: '#2a2b3d' }}>/</span>
          <span style={{ color: '#4a4b60' }}>{projectId.slice(0, 8)}...</span>
          <span style={{ color: '#2a2b3d' }}>/</span>
          <span style={{ color: '#e0e0ea' }}>Architecture Visualization</span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
            <GitBranch className="w-3.5 h-3.5" style={{ color: '#7c6fff' }} />
            <span className="text-[11px] font-semibold" style={{ color: '#c0c0d0' }}>Interactive Graph</span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative" style={{ height: 'calc(100% - 80px)' }}>
        {/* Graph */}
        <div ref={graphContainerRef} className="flex-1 relative" style={{ width: '100%', height: '100%', display: 'block' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            onNodeClick={(_, node) => setSelectedNode(node)}
            defaultViewport={initialViewport}
            style={{ width: '100%', height: '100%', display: 'block' }}
          >
          <Background
            variant={BackgroundVariant.Dots}
            gap={24}
            size={1}
            color="rgba(255,255,255,0.04)"
          />
          <Controls />

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
  </div>
)
}
