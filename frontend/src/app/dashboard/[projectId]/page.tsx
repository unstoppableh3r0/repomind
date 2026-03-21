'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  FileCode2,
  GitBranch,
  HardDrive,
  Hash,
  Loader2,
  Package,
  Sparkles,
  Zap,
} from 'lucide-react'
import { analyzeRepo, getAnalysisStatus, getArchitecture, getRepoStructure } from '@/lib/api'
import { useStore } from '@/lib/store'
import { formatNumber, getLanguageColor } from '@/lib/utils'
import { toast } from 'sonner'
import type { AnalysisStatus, Architecture, RepoStructure } from '@/lib/api'

const STATUS_META = {
  pending: { icon: Clock, color: '#8b8ca2' },
  cloning: { icon: Loader2, color: '#60a5fa' },
  analyzing: { icon: Loader2, color: '#7c6fff' },
  embedding: { icon: Loader2, color: '#a78bfa' },
  complete: { icon: CheckCircle2, color: '#34d399' },
  failed: { icon: AlertCircle, color: '#f87171' },
}

export default function OverviewPage() {
  const params = useParams()
  const projectId = params.projectId as string

  const { projects, updateProject, structures, architectures, setStructure, setArchitecture } = useStore()

  const [status, setStatus] = useState<AnalysisStatus | null>(null)
  const [structure, setLocalStructure] = useState<RepoStructure | null>(null)
  const [arch, setLocalArch] = useState<Architecture | null>(null)
  const [loading, setLoading] = useState(true)

  const project = projects.find((p) => p.id === projectId)

  const loadData = useCallback(async () => {
    try {
      const s = await getAnalysisStatus(projectId)
      setStatus(s)
      updateProject(projectId, { status: s.status })

      if (s.status === 'complete') {
        if (!structures[projectId]) {
          const structData = await getRepoStructure(projectId)
          setStructure(projectId, structData)
          setLocalStructure(structData)
        } else {
          setLocalStructure(structures[projectId])
        }

        if (!architectures[projectId]) {
          const archData = await getArchitecture(projectId)
          setArchitecture(projectId, archData)
          setLocalArch(archData)
        } else {
          setLocalArch(architectures[projectId])
        }
      }
    } catch {
      // no-op UI fallback handled below
    } finally {
      setLoading(false)
    }
  }, [projectId, updateProject, structures, architectures, setStructure, setArchitecture])

  useEffect(() => {
    loadData()
    const timer = setInterval(() => {
      if (status && !['complete', 'failed'].includes(status.status)) {
        loadData()
      }
    }, 3000)

    return () => clearInterval(timer)
  }, [loadData, status])

  async function retry() {
    if (!project?.github_url) {
      toast.error('Missing repository URL for retry.')
      return
    }

    try {
      await analyzeRepo({ github_url: project.github_url, branch: 'main' })
      toast.success('Analysis restarted.')
      loadData()
    } catch {
      toast.error('Could not restart analysis.')
    }
  }

  const cards = useMemo(() => {
    if (!structure) return []
    return [
      { label: 'Files', value: formatNumber(structure.total_files), icon: FileCode2, color: '#60a5fa' },
      { label: 'Lines', value: formatNumber(structure.total_lines), icon: Hash, color: '#7c6fff' },
      { label: 'Size', value: `${structure.size_mb} MB`, icon: HardDrive, color: '#a78bfa' },
      { label: 'Frameworks', value: `${structure.frameworks.length}`, icon: Package, color: '#f472b6' },
    ]
  }, [structure])

  const keyFeatures = Array.isArray(arch?.summary?.key_features)
    ? arch.summary.key_features
    : []

  if (loading) {
    return (
      <div className="h-full w-full grid place-items-center">
        <Loader2 className="w-7 h-7 animate-spin text-[#9a8eff]" />
      </div>
    )
  }

  const current = STATUS_META[(status?.status || 'pending') as keyof typeof STATUS_META]
  const CurrentIcon = current.icon

  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="p-8 max-w-[1400px] mx-auto">
        <div className="rm-page-badge mb-4">
          <Sparkles className="w-3 h-3" />
          Analysis Dashboard
        </div>

        <h1 className="text-4xl md:text-5xl font-black tracking-tight gradient-text mb-2">
          {structure?.repo_name || 'Analysis Results'}
        </h1>
        <p className="text-[#8b8ca1] mb-8">
          {structure ? `${structure.owner}/${structure.repo_name}` : 'Repository inspection in progress'}
        </p>

        {status && !['complete', 'failed'].includes(status.status) && (
          <div className="rm-card rounded-2xl p-5 mb-6 border" style={{ borderColor: `${current.color}55` }}>
            <div className="flex items-center gap-3 mb-3">
              <CurrentIcon className="w-4 h-4 animate-spin" style={{ color: current.color }} />
              <span className="text-sm text-[#e5e5f0]">{status.current_step}</span>
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-black/30 text-[#b6b6cc]">
                {status.progress_percent}%
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-black/30 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${status.progress_percent}%`, background: current.color }} />
            </div>
          </div>
        )}

        {status?.status === 'failed' && (
          <div className="rm-card rounded-2xl p-5 mb-6 border border-[#f87171]/40 bg-[#f87171]/10">
            <div className="flex items-start gap-3 mb-3">
              <AlertCircle className="w-5 h-5 text-[#f87171] mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-[#fca5a5]">Analysis failed</p>
                {status.error_message && <p className="text-xs text-[#fbc1c1] mt-0.5">{status.error_message}</p>}
              </div>
            </div>
            <button
              onClick={retry}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-br from-[#f87171] to-[#ef4444]"
            >
              Retry Analysis
            </button>
          </div>
        )}

        {cards.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {cards.map((card) => (
              <div key={card.label} className="rm-card rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg grid place-items-center" style={{ background: `${card.color}22` }}>
                    <card.icon className="w-4 h-4" style={{ color: card.color }} />
                  </div>
                  <span className="text-[11px] uppercase tracking-wide text-[#777792]">{card.label}</span>
                </div>
                <p className="text-2xl font-extrabold text-[#f2f2ff]">{card.value}</p>
              </div>
            ))}
          </div>
        )}

        {structure && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <section className="rm-card rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-[#d7d7e6] mb-4">Languages</h2>
              <div className="space-y-3">
                {structure.languages.slice(0, 6).map((lang) => (
                  <div key={lang.name}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div className="flex items-center gap-2 text-[#b4b4c7]">
                        <span className="w-2 h-2 rounded-full" style={{ background: getLanguageColor(lang.name) }} />
                        {lang.name}
                      </div>
                      <span className="text-[#8f8fa8]">{lang.percentage}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full" style={{ width: `${lang.percentage}%`, background: getLanguageColor(lang.name) }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rm-card rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-[#d7d7e6] mb-4">Summary</h2>
              {arch?.summary ? (
                <>
                  <p className="text-sm text-[#b7b7c9] mb-3 leading-relaxed">{arch.summary.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {keyFeatures.slice(0, 6).map((feature) => (
                      <span key={feature} className="text-xs px-2.5 py-1 rounded-lg border border-white/10 bg-white/5 text-[#a8a8be]">
                        {feature}
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-[#7f7f96]">Summary appears after analysis completes.</p>
              )}
            </section>
          </div>
        )}

        {status?.status === 'complete' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { label: 'Architecture Graph', href: `/dashboard/${projectId}/visualize`, icon: GitBranch },
              { label: 'Chat with Code', href: `/dashboard/${projectId}/chat`, icon: Zap },
              { label: 'Documentation', href: `/dashboard/${projectId}/docs`, icon: FileCode2 },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="rounded-2xl px-4 py-4 bg-gradient-to-br from-[#7c6fff] to-[#a78bfa] text-white flex items-center justify-between"
              >
                <span className="inline-flex items-center gap-2 text-sm font-medium">
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
