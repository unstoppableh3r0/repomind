'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  GitBranch, FileCode2, Hash, HardDrive, Zap,
  CheckCircle2, Clock, AlertCircle, Loader2,
  ArrowRight, Package, Layers
} from 'lucide-react'
import { getAnalysisStatus, getRepoStructure, getArchitecture, analyzeRepo } from '@/lib/api'
import { useStore } from '@/lib/store'
import { formatNumber, formatFileSize, getLanguageColor } from '@/lib/utils'
import { toast } from 'sonner'
import type { RepoStructure, Architecture, AnalysisStatus } from '@/lib/api'

const STATUS_CONFIG = {
  pending: { icon: Clock, color: '#8B8C9E', label: 'Pending', glow: 'rgba(139,140,158,0.2)' },
  cloning: { icon: Loader2, color: '#60a5fa', label: 'Cloning', glow: 'rgba(96,165,250,0.2)' },
  analyzing: { icon: Loader2, color: '#7c6fff', label: 'Analyzing', glow: 'rgba(124,111,255,0.2)' },
  embedding: { icon: Loader2, color: '#a78bfa', label: 'Embedding', glow: 'rgba(167,139,250,0.2)' },
  complete: { icon: CheckCircle2, color: '#34d399', label: 'Complete', glow: 'rgba(52,211,153,0.2)' },
  failed: { icon: AlertCircle, color: '#f87171', label: 'Failed', glow: 'rgba(248,113,113,0.2)' },
}

export default function DashboardPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const { setStructure, setArchitecture, structures, architectures, updateProject, projects } = useStore()

  const [status, setStatus] = useState<AnalysisStatus | null>(null)
  const [structure, setLocalStructure] = useState<RepoStructure | null>(null)
  const [arch, setLocalArch] = useState<Architecture | null>(null)
  const [loading, setLoading] = useState(true)

  const project = projects.find(p => p.id === projectId)

  const fetchData = useCallback(async () => {
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
    } catch (err) {
      console.error('Failed to fetch data:', err)
    } finally {
      setLoading(false)
    }
  }, [projectId, structures, architectures, setStructure, setArchitecture, updateProject])

  const handleRetry = async () => {
    if (!project?.github_url) {
      toast.error('Cannot retry: Missing repository URL.')
      return
    }
    setLoading(true)
    try {
      await analyzeRepo({
        github_url: project.github_url,
        branch: 'main',
      })
      updateProject(projectId, { status: 'pending' })
      toast.success('Analysis restarted!')
      fetchData()
    } catch (err) {
      toast.error('Failed to restart analysis.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(() => {
      if (status?.status && !['complete', 'failed'].includes(status.status)) {
        fetchData()
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [fetchData, status?.status])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: 'rgba(124,111,255,0.3)', borderTopColor: '#7c6fff' }}
        />
      </div>
    )
  }

  const isAnalyzing = status && !['complete', 'failed'].includes(status.status)
  const statusConf = STATUS_CONFIG[status?.status || 'pending']
  const StatusIcon = statusConf.icon

  const statCards = structure ? [
    { icon: FileCode2, label: 'Files', value: formatNumber(structure.total_files), color: '#60a5fa' },
    { icon: Hash, label: 'Lines of Code', value: formatNumber(structure.total_lines), color: '#7c6fff' },
    { icon: HardDrive, label: 'Repo Size', value: `${structure.size_mb} MB`, color: '#a78bfa' },
    { icon: Package, label: 'Frameworks', value: String(structure.frameworks.length), color: '#f472b6' },
  ] : []

  return (
    <div className="p-8 max-w-5xl">

      {/* Header */}
      <div className="mb-10 animate-fade-in">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-0.5 w-8 bg-gradient-to-r from-[#7c6fff] to-transparent rounded-full" />
          <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#4a4b60]">Repository Overview</span>
        </div>
        <h1
          className="text-5xl font-black mb-3"
          style={{ letterSpacing: '-0.04em', color: '#f0f0f5', lineHeight: 1 }}
        >
          {structure?.repo_name || 'Analysis Results'}
        </h1>
        <p className="text-base font-medium" style={{ color: '#8b8c9e' }}>
          {structure
            ? `${structure.owner} / ${structure.repo_name}`
            : 'Unlocking your codebase intelligence...'}
        </p>
      </div>

      {/* Status card (while analyzing) */}
      {isAnalyzing && (
        <div
          className="mb-6 p-5 rounded-2xl animate-fade-in"
          style={{
            background: `${statusConf.glow}`,
            border: `1px solid ${statusConf.color}30`,
          }}
        >
          <div className="flex items-center gap-3 mb-3">
            <StatusIcon
              className="w-4 h-4 animate-spin"
              style={{ color: statusConf.color }}
            />
            <span className="font-medium text-sm" style={{ color: '#e0e0ea' }}>
              {status?.current_step}
            </span>
            <span
              className="ml-auto text-xs font-mono px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(0,0,0,0.3)', color: statusConf.color }}
            >
              {status?.progress_percent}%
            </span>
          </div>
          <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.3)' }}>
            <div
              className="h-full rounded-full transition-all duration-700 shimmer"
              style={{
                width: `${status?.progress_percent || 0}%`,
                background: `linear-gradient(90deg, ${statusConf.color}99, ${statusConf.color})`,
              }}
            />
          </div>
        </div>
      )}

      {/* Error state */}
      {status?.status === 'failed' && (
        <div
          className="mb-6 p-5 rounded-2xl animate-fade-in"
          style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.2)' }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-red-500/10">
              <AlertCircle className="w-5 h-5" style={{ color: '#f87171' }} />
            </div>
            <div>
              <span className="font-bold text-sm block" style={{ color: '#f87171' }}>Analysis Failed</span>
              {status.error_message && (
                <p className="text-xs mt-0.5" style={{ color: '#fca5a5' }}>{status.error_message}</p>
              )}
            </div>
          </div>
          <button
            onClick={handleRetry}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #f87171 0%, #ef4444 100%)',
              color: 'white',
              boxShadow: '0 4px 12px rgba(248,113,113,0.25)',
            }}
          >
            <Zap className="w-3.5 h-3.5" />
            Retry Analysis
          </button>
        </div>
      )}

      {/* Stat cards */}
      {structure && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {statCards.map((stat, i) => (
            <div
              key={stat.label}
              className="p-5 rounded-3xl transition-all duration-300 group cursor-default relative overflow-hidden"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                animation: `fade-up 0.5s ease-out ${i * 0.1}s both`,
                backdropFilter: 'blur(10px)',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement
                el.style.background = 'rgba(255,255,255,0.05)'
                el.style.borderColor = `${stat.color}40`
                el.style.transform = 'translateY(-4px)'
                el.style.boxShadow = `0 12px 24px -8px ${stat.color}20`
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement
                el.style.background = 'rgba(255,255,255,0.03)'
                el.style.borderColor = 'rgba(255,255,255,0.08)'
                el.style.transform = 'translateY(0)'
                el.style.boxShadow = 'none'
              }}
            >
              <div className="relative z-10">
                <div className="flex items-center gap-2.5 mb-4">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${stat.color}15`, border: `1px solid ${stat.color}20` }}
                  >
                    <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#4a4b60' }}>{stat.label}</span>
                </div>
                <div
                  className="text-3xl font-black tracking-tighter"
                  style={{ fontVariantNumeric: 'tabular-nums', color: '#ffffff', letterSpacing: '-0.02em' }}
                >
                  {stat.value}
                </div>
              </div>
              {/* Subtle glow */}
              <div style={{ position: 'absolute', bottom: '-20px', right: '-20px', width: '60px', height: '60px', background: stat.color, filter: 'blur(40px)', opacity: 0.1 }} />
            </div>
          ))}
        </div>
      )}

      {/* Languages + Tech stack */}
      {structure && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          {/* Languages */}
          <div
            className="p-5 rounded-2xl"
            style={{
              background: 'rgba(255,255,255,0.025)',
              border: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2.5" style={{ color: '#c0c0d0' }}>
              <FileCode2 className="w-4 h-4" style={{ color: '#5a5b70' }} />
              Languages
            </h2>
            <div className="space-y-3.5">
              {structure.languages.slice(0, 6).map(lang => (
                <div key={lang.name}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: getLanguageColor(lang.name) }}
                      />
                      <span style={{ color: '#b0b0c0' }}>{lang.name}</span>
                    </div>
                    <span className="font-mono" style={{ color: '#5a5b70' }}>{lang.percentage}%</span>
                  </div>
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${lang.percentage}%`,
                        background: getLanguageColor(lang.name),
                        boxShadow: `0 0 8px ${getLanguageColor(lang.name)}60`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tech Stack */}
          <div
            className="p-5 rounded-2xl"
            style={{
              background: 'rgba(255,255,255,0.025)',
              border: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2.5" style={{ color: '#c0c0d0' }}>
              <Layers className="w-4 h-4" style={{ color: '#5a5b70' }} />
              Tech Stack
            </h2>
            <div className="flex flex-wrap gap-2 mb-4">
              {structure.frameworks.map(fw => (
                <span
                  key={fw}
                  className="px-2.5 py-1 rounded-full text-xs font-medium"
                  style={{
                    background: 'rgba(124,111,255,0.1)',
                    border: '1px solid rgba(124,111,255,0.22)',
                    color: '#a78bfa',
                  }}
                >
                  {fw}
                </span>
              ))}
              {structure.frameworks.length === 0 && (
                <span className="text-sm" style={{ color: '#4a4b60' }}>No frameworks detected</span>
              )}
            </div>
            {arch?.summary?.onboarding_advice && (
              <div
                className="p-3 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <p className="text-[10px] uppercase tracking-widest font-medium mb-1" style={{ color: '#4a4b60' }}>Onboarding Tip</p>
                <p className="text-xs leading-relaxed" style={{ color: '#8B8C9E' }}>{arch.summary.onboarding_advice}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Project summary */}
      {arch?.summary && (
        <div
          className="p-5 rounded-2xl mb-4"
          style={{
            background: 'rgba(255,255,255,0.025)',
            border: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <div className="flex items-center gap-2.5 mb-2">
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(245,158,11,0.15)' }}
            >
              <Zap className="w-3.5 h-3.5" style={{ color: '#f59e0b' }} />
            </div>
            <h2 className="font-semibold text-sm" style={{ color: '#e0e0ea' }}>{arch.summary.project_name}</h2>
            <span
              className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-medium"
              style={{ background: 'rgba(255,255,255,0.06)', color: '#5a5b70' }}
            >
              {arch.summary.complexity_level}
            </span>
          </div>
          <p className="text-sm leading-relaxed mb-3" style={{ color: '#8B8C9E' }}>{arch.summary.description}</p>
          {arch.summary.key_features?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {arch.summary.key_features.slice(0, 5).map(f => (
                <span
                  key={f}
                  className="text-xs px-2.5 py-1 rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.04)', color: '#6b6c80', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  {f}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quick actions */}
      {status?.status === 'complete' && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Architecture Graph', href: `/dashboard/${projectId}/visualize`, icon: GitBranch, from: '#7c6fff', to: '#6d52f5', glow: 'rgba(124,111,255,0.3)' },
            { label: 'Chat with Code', href: `/dashboard/${projectId}/chat`, icon: Zap, from: '#a78bfa', to: '#7c6fff', glow: 'rgba(167,139,250,0.3)' },
            { label: 'Documentation', href: `/dashboard/${projectId}/docs`, icon: FileCode2, from: '#f472b6', to: '#db2777', glow: 'rgba(244,114,182,0.25)' },
          ].map(action => (
            <Link
              key={action.label}
              href={action.href}
              className="p-4 rounded-2xl flex items-center justify-between group transition-all duration-200"
              style={{
                background: `linear-gradient(135deg, ${action.from} 0%, ${action.to} 100%)`,
                boxShadow: `0 4px 20px ${action.glow}`,
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'
                  ; (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 32px ${action.glow}`
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
                  ; (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 20px ${action.glow}`
              }}
            >
              <div className="flex items-center gap-2.5">
                <action.icon className="w-4 h-4 text-white/80" />
                <span className="font-medium text-sm text-white">{action.label}</span>
              </div>
              <ArrowRight className="w-4 h-4 text-white/60 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
