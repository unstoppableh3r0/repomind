'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Github, Zap, GitBranch, MessageSquare, Layers, Sparkles } from 'lucide-react'
import { analyzeRepo } from '@/lib/api'
import { useStore } from '@/lib/store'

function normalizeGitHubUrl(input: string): string | null {
  const raw = input.trim()
  if (!raw) return null

  // Accept SSH git URLs like: git@github.com:owner/repo.git
  const sshMatch = raw.match(/^git@github\.com:([^\s/]+)\/([^\s]+?)(?:\.git)?\/?$/i)
  if (sshMatch) {
    return `https://github.com/${sshMatch[1]}/${sshMatch[2]}`
  }

  // Accept plain host forms like: github.com/owner/repo
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`

  try {
    const parsed = new URL(withProtocol)
    const host = parsed.hostname.toLowerCase()
    if (host !== 'github.com' && host !== 'www.github.com') return null

    const parts = parsed.pathname.split('/').filter(Boolean)
    if (parts.length < 2) return null

    const owner = parts[0]
    const repo = parts[1].replace(/\.git$/i, '')
    if (!owner || !repo) return null

    return `https://github.com/${owner}/${repo}`
  } catch {
    return null
  }
}

export default function HomePage() {
  const router = useRouter()
  const { addProject, setCurrentProject } = useStore()

  const [url, setUrl] = useState('')
  const [branch, setBranch] = useState('main')
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [focused, setFocused] = useState(false)

  function goToDashboard(projectId: string) {
    const target = `/dashboard/${projectId}`
    router.push(target)

    // Fallback for occasional client-router no-op in dev/hot-reload states.
    setTimeout(() => {
      if (typeof window !== 'undefined' && window.location.pathname !== target) {
        window.location.assign(target)
      }
    }, 180)
  }

  async function startAnalysis(e: React.FormEvent) {
    e.preventDefault()

    const normalizedUrl = normalizeGitHubUrl(url)
    if (!normalizedUrl) {
      toast.error('Enter a valid GitHub URL (https://github.com/owner/repo or git@github.com:owner/repo.git).')
      return
    }

    setLoading(true)
    try {
      const result = await analyzeRepo({
        github_url: normalizedUrl,
        branch: branch.trim() || 'main',
        github_token: token.trim() || undefined,
      })

      addProject({
        id: result.project_id,
        name: normalizedUrl.split('/').pop() || 'Repository',
        github_url: normalizedUrl,
        status: 'pending',
        created_at: new Date().toISOString(),
      })
      setCurrentProject(result.project_id)
      toast.success('Analysis started')
      goToDashboard(result.project_id)
    } catch (error: any) {
      const message = error?.response?.data?.detail || error?.message || 'Failed to start analysis'
      toast.error(String(message))
    } finally {
      setLoading(false)
    }
  }

  const features = [
    {
      icon: GitBranch,
      title: 'Architecture Diagrams',
      desc: 'Interactive maps generated directly from your code.',
      color: '#7c6fff',
    },
    {
      icon: Zap,
      title: 'Workflow Detection',
      desc: 'Reverse-engineers auth, payments, and core flows.',
      color: '#a78bfa',
    },
    {
      icon: MessageSquare,
      title: 'Chat with Codebase',
      desc: 'Ask natural language questions grounded in source.',
      color: '#ec4899',
    },
  ]

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#080810',
        color: '#ffffff',
        position: 'relative',
        overflowX: 'hidden',
        paddingBottom: '100px',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.05,
          pointerEvents: 'none',
          backgroundImage:
            'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '600px',
          background: 'radial-gradient(circle at 50% 0%, rgba(124,111,255,0.1) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <header
        style={{
          position: 'relative',
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '32px 40px',
          maxWidth: '1200px',
          margin: '0 auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #7c6fff 0%, #a78bfa 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(124,111,255,0.3)',
            }}
          >
            <Layers color="white" size={20} />
          </div>
          <div>
            <h1 style={{ fontWeight: 800, fontSize: '20px', letterSpacing: '-0.5px', margin: 0 }}>RepoMind</h1>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#8B8C9E' }}>AI-powered codebase understanding</p>
          </div>
        </div>

        <a
          href="https://github.com"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'white',
            padding: '10px 18px',
            borderRadius: '12px',
            fontSize: '14px',
            textDecoration: 'none',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Github size={16} /> GitHub
        </a>
      </header>

      <main style={{ position: 'relative', zIndex: 10, maxWidth: '980px', margin: '0 auto', padding: '90px 20px 0', textAlign: 'center' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '99px',
            background: 'rgba(124,111,255,0.1)',
            border: '1px solid rgba(124,111,255,0.2)',
            color: '#a78bfa',
            fontSize: '13px',
            fontWeight: 600,
            marginBottom: '34px',
          }}
        >
          <Sparkles size={14} /> AI-Powered Codebase Understanding
        </div>

        <h2 style={{ fontSize: '64px', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-2px', marginBottom: '20px' }}>
          Understand any codebase
          <br />
          <span
            style={{
              background: 'linear-gradient(135deg, #a78bfa 0%, #7c6fff 50%, #c4b5fd 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            in minutes
          </span>
        </h2>

        <p style={{ fontSize: '19px', color: '#8B8C9E', lineHeight: 1.6, maxWidth: '640px', margin: '0 auto 44px' }}>
          Paste a GitHub URL to map architecture, detect workflows, generate docs, and chat with your repository.
        </p>

        <form onSubmit={startAnalysis} style={{ maxWidth: '700px', margin: '0 auto 70px' }}>
          <div
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: focused ? '1px solid rgba(124,111,255,0.5)' : '1px solid rgba(255,255,255,0.1)',
              padding: '8px',
              borderRadius: '20px',
              display: 'flex',
              gap: '8px',
              transition: 'all 0.2s',
              boxShadow: focused ? '0 0 40px rgba(124,111,255,0.15)' : 'none',
              marginBottom: '12px',
            }}
          >
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="https://github.com/owner/repository"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                padding: '16px',
                color: 'white',
                fontSize: '16px',
                outline: 'none',
              }}
              required
            />
            <button
              type="submit"
              disabled={loading}
              style={{
                background: 'linear-gradient(135deg, #7c6fff 0%, #a78bfa 100%)',
                border: 'none',
                color: 'white',
                padding: '0 28px',
                borderRadius: '14px',
                fontSize: '16px',
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.75 : 1,
              }}
            >
              {loading ? 'Analyzing...' : 'Analyze'}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '8px' }}>
            <input
              type="text"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder="Branch (default: main)"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '12px',
                padding: '10px 12px',
                color: '#d7d7e6',
                fontSize: '14px',
                outline: 'none',
              }}
            />
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="GitHub token (optional, private repos)"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '12px',
                padding: '10px 12px',
                color: '#d7d7e6',
                fontSize: '14px',
                outline: 'none',
              }}
            />
          </div>
        </form>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
            textAlign: 'left',
          }}
        >
          {features.map((feature) => (
            <div
              key={feature.title}
              style={{
                padding: '22px',
                borderRadius: '24px',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: `${feature.color}20`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px',
                }}
              >
                <feature.icon color={feature.color} size={22} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px' }}>{feature.title}</h3>
              <p style={{ fontSize: '14px', color: '#9393aa', lineHeight: 1.5, margin: 0 }}>{feature.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
