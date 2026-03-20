'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard, GitBranch, Workflow, MessageSquare,
  BookOpen, Code2, ChevronLeft, Layers, ExternalLink
} from 'lucide-react'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Overview', href: '' },
  { icon: GitBranch, label: 'Architecture', href: '/visualize' },
  { icon: Workflow, label: 'Workflows', href: '/workflows' },
  { icon: MessageSquare, label: 'Chat', href: '/chat' },
  { icon: BookOpen, label: 'Docs', href: '/docs' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const params = useParams()
  const pathname = usePathname()
  const router = useRouter()
  const projectId = params.projectId as string
  const { projects, setCurrentProject } = useStore()

  useEffect(() => {
    setCurrentProject(projectId)
  }, [projectId, setCurrentProject])

  const project = projects.find(p => p.id === projectId)
  const repoName = project?.github_url.split('/').slice(-2).join('/') || 'Repository'
  const repoInitial = repoName.split('/').pop()?.[0]?.toUpperCase() || 'R'

  return (
    <div className="min-h-screen" style={{ display: 'flex', background: '#080810', color: '#f0f0f5', position: 'relative', overflow: 'hidden' }}>
      
      {/* ── Background Grid ── */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.05, pointerEvents: 'none', backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '600px', background: 'radial-gradient(circle at 50% 0%, rgba(124,111,255,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* ── Sidebar ── */}
      <aside
        className="w-64 flex-shrink-0 z-10"
        style={{
          display: 'flex',
          flexDirection: 'column',
          background: 'rgba(8,8,16,0.6)',
          borderRight: '1px solid rgba(255,255,255,0.07)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
        }}
      >
        {/* Logo */}
        <div className="px-4 pt-5 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <Link href="/" className="flex items-center gap-2.5 mb-5 group">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200"
              style={{
                background: 'linear-gradient(135deg, #7c6fff 0%, #a78bfa 100%)',
                boxShadow: '0 0 12px rgba(124,111,255,0.35)',
              }}
            >
              <Layers className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-sm" style={{ letterSpacing: '-0.01em' }}>RepoMind</span>
          </Link>

          {/* Project info card */}
          <div
            className="rounded-xl p-3 rm-card"
            data-interactive="true"
          >
            <div className="flex items-center gap-2.5 mb-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold"
                style={{ background: 'linear-gradient(135deg, #7c6fff22 0%, #a78bfa22 100%)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.25)' }}
              >
                {repoInitial}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate" style={{ color: '#c0c0d0', letterSpacing: '-0.01em' }}>
                  {repoName.split('/').pop()}
                </p>
                <p className="text-[10px] truncate" style={{ color: '#4a4b60' }}>
                  {repoName.split('/')[0]}
                </p>
              </div>
            </div>
            {project?.github_url && (
              <a
                href={project.github_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[11px] font-medium transition-colors"
                style={{ color: '#5a5b70' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#a78bfa')}
                onMouseLeave={e => (e.currentTarget.style.color = '#5a5b70')}
              >
                <ExternalLink className="w-3 h-3" />
                View on GitHub
              </a>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav
          className="flex-1 px-3 py-4"
          style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}
        >
          <p className="px-3 text-[10px] font-medium uppercase tracking-widest mb-3" style={{ color: '#3d3e52' }}>Navigation</p>
          {NAV_ITEMS.map(item => {
            const href = `/dashboard/${projectId}${item.href}`
            const isActive = item.href === ''
              ? pathname === `/dashboard/${projectId}`
              : pathname.startsWith(href)

            return (
              <Link
                key={item.label}
                href={href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 relative group',
                )}
                style={{
                  background: isActive ? 'rgba(124,111,255,0.12)' : 'transparent',
                  color: isActive ? '#a78bfa' : '#5a5b70',
                  border: isActive ? '1px solid rgba(124,111,255,0.2)' : '1px solid transparent',
                  display: 'flex', // Guarantee flex behavior
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'
                      ; (e.currentTarget as HTMLElement).style.color = '#c0c0d0'
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.background = 'transparent'
                      ; (e.currentTarget as HTMLElement).style.color = '#5a5b70'
                  }
                }}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Back to home */}
        <div className="px-3 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-all duration-150"
            style={{ color: '#3d3e52', display: 'flex' }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'
                ; (e.currentTarget as HTMLElement).style.color = '#8B8C9E'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'transparent'
                ; (e.currentTarget as HTMLElement).style.color = '#3d3e52'
            }}
          >
            <ChevronLeft className="w-4 h-4" />
            New analysis
          </Link>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
