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
      toast.error('Please enter a valid GitHub URL (https://github.com/owner/repo)')
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
      toast.error(err?.response?.data?.detail || 'Failed to start analysis. Check the URL and try again.')
    } finally {
      setLoading(false)
    }
  }

  const exampleRepos = [
    { name: 'FastAPI', url: 'https://github.com/tiangolo/fastapi' },
    { name: 'Next.js', url: 'https://github.com/vercel/next.js' },
    { name: 'Django', url: 'https://github.com/django/django' },
  ]

  const features = [
    {
      icon: GitBranch,
      title: 'Architecture Diagrams',
      desc: 'Interactive module dependency graphs and service relationship maps, auto-generated from your code.',
      color: '#7c6fff',
      glow: 'rgba(124,111,255,0.15)',
    },
    {
      icon: Zap,
      title: 'Workflow Detection',
      desc: 'Automatically reverse-engineers key flows: auth, payments, registrations, API lifecycles.',
      color: '#a78bfa',
      glow: 'rgba(167,139,250,0.15)',
    },
    {
      icon: MessageSquare,
      title: 'Chat with Codebase',
      desc: 'Ask natural language questions. Get answers grounded in the actual code with file references.',
      color: '#ec4899',
      glow: 'rgba(236,72,153,0.12)',
    },
    {
      icon: BookOpen,
      title: 'Onboarding Docs',
      desc: 'Auto-generated developer onboarding guide, architecture overview, and setup instructions.',
      color: '#34d399',
      glow: 'rgba(52,211,153,0.12)',
    },
    {
      icon: Layers,
      title: 'Language Agnostic',
      desc: 'Works with Python, JavaScript, TypeScript, Java, Go, Rust, and more out of the box.',
      color: '#f59e0b',
      glow: 'rgba(245,158,11,0.12)',
    },
    {
      icon: Code2,
      title: 'Any GitHub Repo',
      desc: 'Public or private repos. Just paste the URL. Analysis typically completes in 1–3 minutes.',
      color: '#64748b',
      glow: 'rgba(100,116,139,0.12)',
    },
  ]

  return (
    <div className="min-h-screen text-white relative overflow-hidden" style={{ background: '#080810' }}>

      {/* ── Animated background orbs ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute rounded-full"
          style={{
            width: '600px', height: '600px',
            top: '-200px', left: '10%',
            background: 'radial-gradient(circle, rgba(124,111,255,0.12) 0%, transparent 70%)',
            animation: 'float 8s ease-in-out infinite',
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: '500px', height: '500px',
            top: '-100px', right: '5%',
            background: 'radial-gradient(circle, rgba(167,139,250,0.1) 0%, transparent 70%)',
            animation: 'float 10s ease-in-out infinite reverse',
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: '300px', height: '300px',
            bottom: '20%', left: '30%',
            background: 'radial-gradient(circle, rgba(124,111,255,0.06) 0%, transparent 70%)',
            animation: 'float 12s ease-in-out infinite',
          }}
        />
        {/* Fine grid */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* ── Navigation ── */}
      <nav className="relative z-20 flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #7c6fff 0%, #a78bfa 100%)', boxShadow: '0 0 16px rgba(124,111,255,0.4)' }}
          >
            <Layers className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-base tracking-tight" style={{ letterSpacing: '-0.01em' }}>RepoMind</span>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/dashboard"
            className="text-sm transition-colors"
            style={{ color: '#8B8C9E' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#f0f0f5')}
            onMouseLeave={e => (e.currentTarget.style.color = '#8B8C9E')}
          >
            Dashboard
          </a>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.09)',
              color: '#c0c0cc',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.09)'
                ; (e.currentTarget as HTMLElement).style.color = '#fff'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'
                ; (e.currentTarget as HTMLElement).style.color = '#c0c0cc'
            }}
          >
            <Github className="w-3.5 h-3.5" />
            GitHub
          </a>
        </div>
      </nav>

      {/* ── Hero ── */}
      <main className="relative z-10 max-w-4xl mx-auto px-6 pt-20 pb-28 text-center">

        {/* Badge */}
        <div
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm mb-8"
          style={{
            background: 'rgba(124,111,255,0.1)',
            border: '1px solid rgba(124,111,255,0.25)',
            color: '#a78bfa',
            animation: 'fade-up 0.5s ease-out',
          }}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="font-medium">AI-Powered Codebase Understanding</span>
        </div>

        {/* Headline */}
        <h1
          className="font-bold tracking-tight mb-6"
          style={{
            fontSize: 'clamp(2.8rem, 6vw, 4.5rem)',
            lineHeight: '1.08',
            letterSpacing: '-0.03em',
            animation: 'fade-up 0.6s ease-out 0.1s both',
          }}
        >
          Understand any codebase
          <br />
          <span style={{
            background: 'linear-gradient(135deg, #a78bfa 0%, #7c6fff 45%, #c4b5fd 100%)',
            backgroundSize: '200% 200%',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            animation: 'gradientShift 5s ease infinite',
            display: 'inline-block',
          }}>
            in minutes, not weeks
          </span>
        </h1>

        {/* Subheadline */}
        <p
          className="text-lg max-w-xl mx-auto mb-12 leading-relaxed"
          style={{
            color: '#8B8C9E',
            animation: 'fade-up 0.6s ease-out 0.2s both',
          }}
        >
          Paste a GitHub URL. RepoMind maps the architecture, detects workflows, and lets you chat with the codebase — instantly.
        </p>

        {/* ── Input Form ── */}
        <form
          onSubmit={handleAnalyze}
          className="max-w-2xl mx-auto"
          style={{ animation: 'fade-up 0.6s ease-out 0.3s both' }}
        >
          <div
            className="rounded-2xl p-1.5 mb-3 transition-all duration-300"
            style={{
              background: focused ? 'rgba(124,111,255,0.06)' : 'rgba(255,255,255,0.03)',
              border: focused ? '1px solid rgba(124,111,255,0.4)' : '1px solid rgba(255,255,255,0.08)',
              boxShadow: focused ? '0 0 0 4px rgba(124,111,255,0.08), 0 0 40px rgba(124,111,255,0.1)' : 'none',
            }}
          >
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Github
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                  style={{ color: '#5a5b70' }}
                />
                <input
                  type="url"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  placeholder="https://github.com/owner/repository"
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-white text-sm font-medium transition-colors"
                  style={{
                    background: 'transparent',
                    outline: 'none',
                    border: 'none',
                    caretColor: '#a78bfa',
                  }}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all duration-200 whitespace-nowrap flex-shrink-0"
                style={{
                  background: loading ? 'rgba(124,111,255,0.4)' : 'linear-gradient(135deg, #7c6fff 0%, #a78bfa 100%)',
                  color: '#fff',
                  boxShadow: loading ? 'none' : '0 0 20px rgba(124,111,255,0.35)',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transform: 'translateZ(0)',
                }}
                onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.boxShadow = '0 0 30px rgba(124,111,255,0.5)' }}
                onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLElement).style.boxShadow = '0 0 20px rgba(124,111,255,0.35)' }}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>Analyze <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </div>
          </div>

          {/* Advanced toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1 mx-auto text-xs transition-colors mb-1"
            style={{ color: '#5a5b70' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#8B8C9E')}
            onMouseLeave={e => (e.currentTarget.style.color = '#5a5b70')}
          >
            <ChevronRight
              className="w-3 h-3 transition-transform duration-200"
              style={{ transform: showAdvanced ? 'rotate(90deg)' : 'rotate(0deg)' }}
            />
            Advanced options
          </button>

          {showAdvanced && (
            <div className="mt-3 grid grid-cols-2 gap-3 text-left animate-fade-in">
              {[
                { label: 'Branch', value: branch, setter: setBranch, placeholder: 'main', type: 'text' },
                { label: 'GitHub Token (private repos)', value: token, setter: setToken, placeholder: 'ghp_...', type: 'password' },
              ].map(field => (
                <div key={field.label}>
                  <label className="block text-[11px] font-medium mb-1.5" style={{ color: '#5a5b70' }}>{field.label}</label>
                  <input
                    type={field.type}
                    value={field.value}
                    onChange={e => field.setter(e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-zinc-600 transition-colors"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      outline: 'none',
                    }}
                    onFocus={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(124,111,255,0.4)'}
                    onBlur={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)'}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Example repos */}
          <div className="mt-5 flex items-center justify-center gap-3 text-sm">
            <span style={{ color: '#3d3e52' }}>Try:</span>
            {exampleRepos.map(r => (
              <button
                key={r.name}
                type="button"
                onClick={() => setUrl(r.url)}
                className="transition-colors text-xs font-medium"
                style={{ color: '#5a5b70' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#a78bfa')}
                onMouseLeave={e => (e.currentTarget.style.color = '#5a5b70')}
              >
                {r.name}
              </button>
            ))}
          </div>
        </form>

        {/* ── Feature grid ── */}
        <div
          className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-24 text-left"
          style={{ animation: 'fade-up 0.7s ease-out 0.4s both' }}
        >
          {features.map(f => (
            <div
              key={f.title}
              className="p-5 rounded-2xl cursor-default group transition-all duration-300"
              style={{
                background: 'rgba(255,255,255,0.025)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement
                el.style.background = `${f.glow}`
                el.style.borderColor = `${f.color}40`
                el.style.transform = 'translateY(-2px)'
                el.style.boxShadow = `0 8px 32px ${f.glow}`
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement
                el.style.background = 'rgba(255,255,255,0.025)'
                el.style.borderColor = 'rgba(255,255,255,0.07)'
                el.style.transform = 'translateY(0)'
                el.style.boxShadow = 'none'
              }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center mb-4"
                style={{ background: `${f.color}18`, border: `1px solid ${f.color}30` }}
              >
                <f.icon className="w-4.5 h-4.5" style={{ color: f.color, width: '16px', height: '16px' }} />
              </div>
              <h3 className="font-semibold text-sm mb-2" style={{ color: '#e8e8f0' }}>{f.title}</h3>
              <p className="text-xs leading-relaxed" style={{ color: '#6b6c80' }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
