'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Loader2, ChevronDown, ChevronRight, Zap, Code2, Database, Globe } from 'lucide-react'
import { getWorkflows } from '@/lib/api'
import { useStore } from '@/lib/store'
import { cn, WORKFLOW_TYPE_COLORS } from '@/lib/utils'
import type { Workflow } from '@/lib/api'

const STEP_ICONS: Record<string, React.ElementType> = {
  route: Globe,
  service: Zap,
  database: Database,
  validation: Code2,
  external: Globe,
}

const COMPLEXITY_STYLES: Record<string, { color: string; bg: string; border: string }> = {
  simple: { color: '#34d399', bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.2)' },
  medium: { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.2)' },
  complex: { color: '#f87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.2)' },
}

const COMPLEXITY_BORDER: Record<string, string> = {
  simple: '#34d399',
  medium: '#fbbf24',
  complex: '#f87171',
}

export default function WorkflowsPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const { workflows: storeWorkflows, setWorkflows } = useStore()

  const [workflows, setLocalWorkflows] = useState<Workflow[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const cached = storeWorkflows[projectId]
        if (cached) { setLocalWorkflows(cached); setLoading(false); return }
        const data = await getWorkflows(projectId)
        setWorkflows(projectId, data.workflows)
        setLocalWorkflows(data.workflows)
        if (data.workflows.length > 0) setExpandedId(data.workflows[0].id)
      } catch (err) {
        console.error('Failed to load workflows:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [projectId, storeWorkflows, setWorkflows])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div
          className="w-7 h-7 rounded-full border-2 animate-spin"
          style={{ borderColor: 'rgba(124,111,255,0.3)', borderTopColor: '#7c6fff' }}
        />
      </div>
    )
  }

  if (workflows.length === 0) {
    return (
      <div className="p-8 text-center">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <Zap className="w-7 h-7" style={{ color: '#3d3e52' }} />
        </div>
        <h2 className="font-semibold text-lg mb-2" style={{ color: '#e0e0ea' }}>No workflows detected</h2>
        <p className="text-sm" style={{ color: '#4a4b60' }}>
          This repository may not have detectable route handlers or service calls.
        </p>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1" style={{ color: '#f0f0f5', letterSpacing: '-0.02em' }}>
          Developer Workflows
        </h1>
        <p className="text-sm" style={{ color: '#5a5b70' }}>
          {workflows.length} workflow{workflows.length !== 1 ? 's' : ''} reverse-engineered from the codebase
        </p>
      </div>

      <div className="space-y-3">
        {workflows.map((workflow, i) => (
          <WorkflowCard
            key={workflow.id}
            workflow={workflow}
            isExpanded={expandedId === workflow.id}
            onToggle={() => setExpandedId(expandedId === workflow.id ? null : workflow.id)}
            index={i}
          />
        ))}
      </div>
    </div>
  )
}

function WorkflowCard({
  workflow, isExpanded, onToggle, index
}: {
  workflow: Workflow
  isExpanded: boolean
  onToggle: () => void
  index: number
}) {
  const complexity = workflow.complexity as keyof typeof COMPLEXITY_STYLES
  const cStyle = COMPLEXITY_STYLES[complexity] || COMPLEXITY_STYLES.medium
  const borderColor = COMPLEXITY_BORDER[complexity] || COMPLEXITY_BORDER.medium

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all duration-200"
      style={{
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderLeft: `3px solid ${borderColor}50`,
        animation: `fade-up 0.4s ease-out ${index * 0.06}s both`,
      }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderLeftColor = `${borderColor}99`}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderLeftColor = `${borderColor}50`}
    >
      {/* Header button */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 px-5 py-4 text-left transition-all duration-150"
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
      >
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(124,111,255,0.1)', border: '1px solid rgba(124,111,255,0.18)' }}
        >
          <Zap className="w-4 h-4" style={{ color: '#7c6fff' }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="font-semibold text-sm" style={{ color: '#e0e0ea' }}>{workflow.name}</h3>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize"
              style={{ background: cStyle.bg, color: cStyle.color, border: `1px solid ${cStyle.border}` }}
            >
              {workflow.complexity}
            </span>
          </div>
          <p className="text-xs truncate" style={{ color: '#5a5b70' }}>{workflow.description}</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-xs hidden sm:block" style={{ color: '#3d3e52' }}>
            {workflow.steps.length} steps
          </span>
          {isExpanded
            ? <ChevronDown className="w-4 h-4" style={{ color: '#4a4b60' }} />
            : <ChevronRight className="w-4 h-4" style={{ color: '#4a4b60' }} />
          }
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div
          className="px-5 pb-5 animate-fade-in"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="pt-3 pb-4">
            <span className="text-[10px] uppercase tracking-widest font-medium" style={{ color: '#3d3e52' }}>Triggered by: </span>
            <span className="text-xs font-mono" style={{ color: '#8B8C9E' }}>{workflow.trigger}</span>
          </div>

          <div className="space-y-3">
            {workflow.steps.map((step, i) => {
              const Icon = STEP_ICONS[step.type] || Code2

              return (
                <div key={step.order} className="flex items-start gap-3">
                  {/* Step number + connector */}
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold"
                      style={{
                        background: 'rgba(124,111,255,0.12)',
                        border: '1px solid rgba(124,111,255,0.22)',
                        color: '#a78bfa',
                      }}
                    >
                      {step.order}
                    </div>
                    {i < workflow.steps.length - 1 && (
                      <div
                        className="w-px mt-1"
                        style={{ height: '20px', background: 'rgba(124,111,255,0.15)' }}
                      />
                    )}
                  </div>

                  {/* Step content */}
                  <div className="flex-1 pb-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 capitalize"
                        style={{
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          color: '#6b6c80',
                        }}
                      >
                        <Icon className="w-2.5 h-2.5" />
                        {step.type}
                      </span>
                      <span className="font-medium text-sm" style={{ color: '#c0c0d0' }}>{step.name}</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: '#5a5b70' }}>{step.description}</p>
                    {step.file_path && (
                      <p className="text-[11px] font-mono mt-1" style={{ color: '#3d3e52' }}>
                        {step.file_path}{step.function_name && ` → ${step.function_name}()`}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Involved files */}
          {workflow.involved_files?.length > 0 && (
            <div
              className="mt-4 pt-4"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
            >
              <p className="text-[10px] uppercase tracking-widest font-medium mb-2" style={{ color: '#3d3e52' }}>Files involved:</p>
              <div className="flex flex-wrap gap-1.5">
                {workflow.involved_files.map(f => (
                  <span
                    key={f}
                    className="text-[11px] font-mono px-2.5 py-1 rounded-lg"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: '#5a5b70' }}
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
