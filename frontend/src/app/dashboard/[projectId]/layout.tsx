'use client'

import { useEffect } from 'react'
import { useParams, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard,
  GitBranch,
  Workflow,
  MessageSquare,
  BookOpen,
  ChevronLeft,
  Layers,
  ExternalLink,
} from 'lucide-react'
import { useStore } from '@/lib/store'

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
  const projectId = params.projectId as string
  const { projects, setCurrentProject } = useStore()

  useEffect(() => {
    setCurrentProject(projectId)
  }, [projectId, setCurrentProject])

  const project = projects.find((p) => p.id === projectId)
  const repoName = project?.github_url.split('/').slice(-2).join('/') || 'Repository'
  const repoInitial = repoName.split('/').pop()?.[0]?.toUpperCase() || 'R'

  return (
    <div
      style={{
        height: '100dvh',
        width: '100%',
        display: 'flex',
        background: '#080810',
        color: '#f0f0f5',
        overflow: 'hidden',
      }}
    >
      <aside
        style={{
          width: '256px',
          height: '100%',
          flexShrink: 0,
          borderRight: '1px solid rgba(255,255,255,0.10)',
          background: 'rgba(11,11,21,0.85)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', textDecoration: 'none', color: 'inherit' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#7c6fff,#a78bfa)', boxShadow: '0 0 16px rgba(124,111,255,.35)' }}>
              <Layers className="w-3.5 h-3.5 text-white" />
            </div>
            <span style={{ fontSize: '14px', fontWeight: 600, letterSpacing: '-0.01em' }}>RepoMind</span>
          </Link>

          <div className="rm-card" data-interactive="true" style={{ borderRadius: '12px', padding: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: '#a78bfa', border: '1px solid rgba(167,139,250,.35)', background: 'rgba(124,111,255,.10)' }}>
                {repoInitial}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ margin: 0, fontSize: '12px', fontWeight: 500, color: '#c9c9d8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{repoName.split('/').pop()}</p>
                <p style={{ margin: 0, marginTop: '2px', fontSize: '10px', color: '#5c5c74', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{repoName.split('/')[0]}</p>
              </div>
            </div>
            {project?.github_url && (
              <a
                href={project.github_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px', color: '#7d7d94', textDecoration: 'none' }}
              >
                <ExternalLink className="w-3 h-3" />
                View on GitHub
              </a>
            )}
          </div>
        </div>

        <nav style={{ flex: 1, padding: '16px 12px', overflowY: 'auto' }}>
          <p style={{ padding: '0 12px', margin: '0 0 12px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.14em', color: '#4a4a62' }}>Navigation</p>
          {NAV_ITEMS.map((item) => {
            const href = `/dashboard/${projectId}${item.href}`
            const isActive = item.href === '' ? pathname === `/dashboard/${projectId}` : pathname.startsWith(href)

            return (
              <Link
                key={item.label}
                href={href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 12px',
                  borderRadius: '12px',
                  fontSize: '14px',
                  textDecoration: 'none',
                  marginBottom: '4px',
                  border: isActive ? '1px solid rgba(124,111,255,.35)' : '1px solid transparent',
                  color: isActive ? '#c8bfff' : '#777792',
                  background: isActive ? 'rgba(124,111,255,.15)' : 'transparent',
                }}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div style={{ padding: '16px 12px', borderTop: '1px solid rgba(255,255,255,0.10)' }}>
          <Link
            href="/"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', borderRadius: '12px', fontSize: '14px', color: '#777792', textDecoration: 'none' }}
          >
            <ChevronLeft className="w-4 h-4" />
            New analysis
          </Link>
        </div>
      </aside>

      <main className="rm-analysis-canvas" style={{ flex: 1, minWidth: 0, height: '100%', position: 'relative', overflow: 'hidden' }}>
        {children}
      </main>
    </div>
  )
}
