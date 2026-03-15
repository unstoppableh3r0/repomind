'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Github, Zap, GitBranch, MessageSquare, BookOpen, ArrowRight, Layers, Sparkles, Code2, ChevronRight } from 'lucide-react'
import { analyzeRepo } from '@/lib/api'
import { useStore } from '@/lib/store'

export default function HomePage() {
  const router = useRouter()
  const { addProject, setCurrentProject } = useStore()
  const [url, setUrl] = useState('')
  const [branch, setBranch] = useState('main')
  const [token, setToken] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [loading, setLoading] = useState(false)
  const [focused, setFocused] = useState(false)

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim()) return
    if (!url.startsWith('https://github.com/')) {
      toast.error('Please enter a valid GitHub URL')
      return
    }
    setLoading(true)
    try {
      const result = await analyzeRepo({
        github_url: url.trim(),
        branch: branch || 'main',
        github_token: token || undefined,
      })
      addProject({
        id: result.project_id,
        name: url.split('/').pop()?.replace('.git', '') || 'Repository',
        github_url: url,
        status: 'pending',
        created_at: new Date().toISOString(),
      })
      setCurrentProject(result.project_id)
      toast.success('Analysis started! Redirecting...')
      router.push(`/dashboard/${result.project_id}`)
    } catch (err: any) {
      toast.error('Failed to start analysis.')
    } finally {
      setLoading(false)
    }
  }

  const features = [
    { icon: GitBranch, title: 'Architecture Diagrams', desc: 'Interactive graphs generated from your code.', color: '#7c6fff' },
    { icon: Zap, title: 'Workflow Detection', desc: 'Reverse-engineers auth, payments, and more.', color: '#a78bfa' },
    { icon: MessageSquare, title: 'Chat with Codebase', desc: 'Ask natural language questions to your repo.', color: '#ec4899' },
  ]

  const containerStyle: React.CSSProperties = {
    minHeight: '100-vh', // fallback
    background: '#080810',
    color: '#ffffff',
    fontFamily: 'Inter, sans-serif',
    position: 'relative',
    overflowX: 'hidden',
    paddingBottom: '100px',
  }

  return (
    <div style={containerStyle}>

      {/* ── Background Grid ── */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.05, pointerEvents: 'none', backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '600px', background: 'radial-gradient(circle at 50% 0%, rgba(124,111,255,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* ── Nav ── */}
      <nav style={{ position: 'relative', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '32px 40px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, #7c6fff 0%, #a78bfa 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(124,111,255,0.3)' }}>
            <Layers color="white" size={20} />
          </div>
          <span style={{ fontWeight: 800, fontSize: '20px', letterSpacing: '-0.5px' }}>RepoMind</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <a href="/dashboard" style={{ color: '#8B8C9E', fontSize: '14px', textDecoration: 'none', fontWeight: 500 }}>Dashboard</a>
          <a href="https://github.com" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '10px 18px', borderRadius: '12px', fontSize: '14px', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Github size={16} /> GitHub
          </a>
        </div>
      </nav>

      {/* ── Hero ── */}
      <main style={{ position: 'relative', zIndex: 10, maxWidth: '800px', margin: '0 auto', padding: '100px 20px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '99px', background: 'rgba(124,111,255,0.1)', border: '1px solid rgba(124,111,255,0.2)', color: '#a78bfa', fontSize: '13px', fontWeight: 600, marginBottom: '40px' }}>
          <Sparkles size={14} /> AI-Powered Codebase Understanding
        </div>

        <h1 style={{ fontSize: '72px', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-2.5px', marginBottom: '24px' }}>
          Understand any codebase <br />
          <span style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #7c6fff 50%, #c4b5fd 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            in minutes, not weeks
          </span>
        </h1>

        <p style={{ fontSize: '20px', color: '#8B8C9E', lineHeight: 1.6, maxWidth: '600px', margin: '0 auto 48px' }}>
          Paste a GitHub URL to map architecture, detect workflows, and chat with your codebase instantly.
        </p>

        {/* ── Input ── */}
        <form onSubmit={handleAnalyze} style={{ maxWidth: '640px', margin: '0 auto 80px' }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: focused ? '1px solid rgba(124,111,255,0.5)' : '1px solid rgba(255,255,255,0.1)', padding: '8px', borderRadius: '20px', display: 'flex', gap: '8px', transition: 'all 0.2s', boxShadow: focused ? '0 0 40px rgba(124,111,255,0.15)' : 'none' }}>
            <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Github color="rgba(255,255,255,0.3)" size={20} style={{ marginLeft: '16px', position: 'absolute' }} />
              <input
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="https://github.com/owner/repository"
                style={{ width: '100%', background: 'transparent', border: 'none', padding: '16px 16px 16px 48px', color: 'white', fontSize: '16px', outline: 'none' }}
                required
              />
            </div>
            <button type="submit" disabled={loading} style={{ background: 'linear-gradient(135deg, #7c6fff 0%, #a78bfa 100%)', border: 'none', color: 'white', padding: '0 32px', borderRadius: '14px', fontSize: '16px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', transition: 'transform 0.1s' }}>
              {loading ? 'Analyzing...' : 'Analyze'}
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginTop: '20px', color: '#3d3e52', fontSize: '13px' }}>
            Try:
            {['FastAPI', 'Next.js', 'Django'].map(repo => (
              <button key={repo} type="button" onClick={() => setUrl(`https://github.com/example/${repo.toLowerCase()}`)} style={{ background: 'none', border: 'none', color: '#5a5b70', fontWeight: 500, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '4px' }}>{repo}</button>
            ))}
          </div>
        </form>

        {/* ── Features ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', textAlign: 'left' }}>
          {features.map(f => (
            <div key={f.title} style={{ padding: '24px', borderRadius: '24px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: f.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                <f.icon color={f.color} size={22} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>{f.title}</h3>
              <p style={{ fontSize: '14px', color: '#6b6c80', lineHeight: 1.5 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
