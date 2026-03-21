'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { ChevronDown, ChevronRight, Loader2, Sparkles, Zap } from 'lucide-react'
import { getWorkflows } from '@/lib/api'
import { useStore } from '@/lib/store'
import type { Workflow } from '@/lib/api'

export default function WorkflowsPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const { workflows: cachedWorkflows, setWorkflows } = useStore()

  const [workflows, setLocalWorkflows] = useState<Workflow[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const cached = cachedWorkflows[projectId]
        if (cached) {
          setLocalWorkflows(cached)
          if (cached.length > 0) setExpandedId(cached[0].id)
          return
        }

        const data = await getWorkflows(projectId)
        setWorkflows(projectId, data.workflows)
        setLocalWorkflows(data.workflows)
        if (data.workflows.length > 0) setExpandedId(data.workflows[0].id)
      } catch {
        setLocalWorkflows([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [projectId, cachedWorkflows, setWorkflows])

  if (loading) {
    return (
      <div className="h-full w-full grid place-items-center">
        <Loader2 className="w-7 h-7 animate-spin text-[#9a8eff]" />
      </div>
    )
  }

  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="p-8 max-w-[1400px] mx-auto">
        <div className="rm-page-badge mb-3">
          <Sparkles className="w-3 h-3" />
          Analysis Flows
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-[#efeff9] mb-1">Developer Workflows</h1>
        <p className="text-sm text-[#86869f] mb-6">
          {workflows.length} workflow{workflows.length !== 1 ? 's' : ''} detected from application routes and services
        </p>

        {workflows.length === 0 ? (
          <div className="rm-card rounded-2xl p-6 text-center">
            <p className="text-[#8b8ba1]">No workflows were detected for this repository.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {workflows.map((workflow) => {
              const open = expandedId === workflow.id
              return (
                <article key={workflow.id} className="rm-card rounded-2xl overflow-hidden">
                  <button
                    onClick={() => setExpandedId(open ? null : workflow.id)}
                    className="w-full text-left px-5 py-4 flex items-center gap-3"
                  >
                    <div className="w-8 h-8 rounded-lg grid place-items-center bg-[#7c6fff]/15 border border-[#7c6fff]/35">
                      <Zap className="w-4 h-4 text-[#b8acff]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[#ececf8]">{workflow.name}</p>
                      <p className="text-xs text-[#8b8ba1] truncate">{workflow.description}</p>
                    </div>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[#9e9eb5] capitalize">
                      {workflow.complexity}
                    </span>
                    {open ? <ChevronDown className="w-4 h-4 text-[#8b8ba1]" /> : <ChevronRight className="w-4 h-4 text-[#8b8ba1]" />}
                  </button>

                  {open && (
                    <div className="px-5 pb-5 border-t border-white/10">
                      <p className="text-[11px] text-[#7b7b94] mt-3 mb-3">Trigger: {workflow.trigger}</p>
                      <div className="space-y-2.5">
                        {workflow.steps.map((step) => (
                          <div key={step.order} className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#7c6fff]/15 border border-[#7c6fff]/35 text-[#cbbfff]">
                                Step {step.order}
                              </span>
                              <p className="text-sm text-[#d7d7e6] font-medium">{step.name}</p>
                            </div>
                            <p className="text-xs text-[#a5a5ba] leading-relaxed">{step.description}</p>
                            {step.file_path && (
                              <p className="text-[11px] text-[#7a7a92] mt-1 font-mono break-all">
                                {step.file_path}
                                {step.function_name ? ` -> ${step.function_name}()` : ''}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
