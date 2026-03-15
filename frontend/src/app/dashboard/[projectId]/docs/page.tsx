'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Loader2, BookOpen, Download, Copy, Check } from 'lucide-react'
import { getDocumentation } from '@/lib/api'
import { useStore } from '@/lib/store'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'
import type { Documentation } from '@/lib/api'

const TABS = [
  { id: 'onboarding', label: 'Onboarding' },
  { id: 'architecture', label: 'Architecture' },
  { id: 'setup', label: 'Setup' },
  { id: 'concepts', label: 'Key Concepts' },
]

export default function DocsPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const { docs: storeDocs, setDocs } = useStore()

  const [docs, setLocalDocs] = useState<Documentation | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('onboarding')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const cached = storeDocs[projectId]
        if (cached) { setLocalDocs(cached); setLoading(false); return }
        const data = await getDocumentation(projectId)
        setDocs(projectId, data)
        setLocalDocs(data)
      } catch (err) {
        console.error('Failed to load docs:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [projectId, storeDocs, setDocs])

  async function copyContent() {
    const content = getActiveContent()
    if (!content) return
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function downloadMarkdown() {
    const content = getActiveContent()
    if (!content) return
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${activeTab}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  function getActiveContent(): string {
    if (!docs) return ''
    switch (activeTab) {
      case 'onboarding': return docs.onboarding_guide || ''
      case 'architecture': return docs.architecture_overview || ''
      case 'setup': return docs.setup_instructions || ''
      case 'concepts': return formatConceptsAsMarkdown(docs)
      default: return ''
    }
  }

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

  if (!docs) {
    return (
      <div className="p-8 text-center">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <BookOpen className="w-8 h-8" style={{ color: '#3d3e52' }} />
        </div>
        <h2 className="font-semibold text-lg mb-2" style={{ color: '#e0e0ea' }}>Documentation not available</h2>
        <p className="text-sm" style={{ color: '#4a4b60' }}>Ensure the repository analysis has completed.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div
        className="flex-shrink-0 px-6 py-4"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold" style={{ color: '#e8e8f0', letterSpacing: '-0.02em' }}>Documentation</h1>
            <p className="text-xs" style={{ color: '#4a4b60' }}>Auto-generated developer documentation</p>
          </div>
          <div className="flex items-center gap-2">
            {[
              { icon: copied ? Check : Copy, label: copied ? 'Copied' : 'Copy', onClick: copyContent, active: copied },
              { icon: Download, label: 'Download', onClick: downloadMarkdown, active: false },
            ].map(btn => (
              <button
                key={btn.label}
                onClick={btn.onClick}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-150"
                style={{
                  background: btn.active ? 'rgba(52,211,153,0.1)' : 'rgba(255,255,255,0.04)',
                  border: btn.active ? '1px solid rgba(52,211,153,0.25)' : '1px solid rgba(255,255,255,0.08)',
                  color: btn.active ? '#34d399' : '#6b6c80',
                }}
                onMouseEnter={e => { if (!btn.active) (e.currentTarget as HTMLElement).style.color = '#c0c0d0' }}
                onMouseLeave={e => { if (!btn.active) (e.currentTarget as HTMLElement).style.color = '#6b6c80' }}
              >
                <btn.icon className="w-3.5 h-3.5" />
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab bar */}
        <div
          className="flex gap-0.5 p-1 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', width: 'fit-content' }}
        >
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
              style={
                activeTab === tab.id
                  ? {
                    background: 'rgba(124,111,255,0.15)',
                    color: '#c4b5fd',
                    border: '1px solid rgba(124,111,255,0.25)',
                  }
                  : {
                    background: 'transparent',
                    color: '#5a5b70',
                    border: '1px solid transparent',
                  }
              }
              onMouseEnter={e => { if (activeTab !== tab.id) (e.currentTarget as HTMLElement).style.color = '#b0b0c0' }}
              onMouseLeave={e => { if (activeTab !== tab.id) (e.currentTarget as HTMLElement).style.color = '#5a5b70' }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-3xl">
          {activeTab === 'concepts' ? (
            <ConceptsTab docs={docs} />
          ) : (
            <MarkdownContent content={getActiveContent()} />
          )}
        </div>
      </div>
    </div>
  )
}

function MarkdownContent({ content }: { content: string }) {
  if (!content) {
    return <p className="text-sm" style={{ color: '#4a4b60' }}>No content available.</p>
  }

  return (
    <div className="prose-repomind">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '')
            const isBlock = !props.inline
            if (isBlock && match) {
              return (
                <div
                  className="my-4 rounded-xl overflow-hidden"
                  style={{ border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <div
                    className="flex items-center px-4 py-2"
                    style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}
                  >
                    <span className="text-xs font-mono" style={{ color: '#5a5b70' }}>{match[1]}</span>
                  </div>
                  <pre
                    className="!m-0 !p-4 overflow-x-auto text-sm"
                    style={{ background: 'rgba(0,0,0,0.35)' }}
                  >
                    <code style={{ color: '#c0c0d0', fontFamily: 'monospace' }}>
                      {String(children).replace(/\n$/, '')}
                    </code>
                  </pre>
                </div>
              )
            }
            return (
              <code
                className="px-1.5 py-0.5 rounded text-sm font-mono"
                style={{ background: 'rgba(124,111,255,0.12)', color: '#c4b5fd', border: '1px solid rgba(124,111,255,0.18)' }}
                {...props}
              >
                {children}
              </code>
            )
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

function ConceptsTab({ docs }: { docs: Documentation }) {
  return (
    <div className="space-y-8 animate-fade-in">
      {docs.key_concepts && docs.key_concepts.length > 0 && (
        <div>
          <h2 className="text-base font-semibold mb-3" style={{ color: '#e0e0ea' }}>Key Concepts</h2>
          <div className="space-y-2">
            {docs.key_concepts.map((concept, i) => (
              <div
                key={i}
                className="flex items-start gap-3 px-4 py-3 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div
                  className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0"
                  style={{ background: '#7c6fff' }}
                />
                <p className="text-sm leading-relaxed" style={{ color: '#a0a0b0' }}>{concept}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {docs.common_gotchas && docs.common_gotchas.length > 0 && (
        <div>
          <h2 className="text-base font-semibold mb-3" style={{ color: '#fbbf24' }}>⚠ Common Gotchas</h2>
          <div className="space-y-2">
            {docs.common_gotchas.map((gotcha, i) => (
              <div
                key={i}
                className="p-3.5 rounded-xl"
                style={{ background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.15)' }}
              >
                <p className="text-sm leading-relaxed" style={{ color: '#b0b0c0' }}>{gotcha}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {docs.first_week_tasks && docs.first_week_tasks.length > 0 && (
        <div>
          <h2 className="text-base font-semibold mb-3" style={{ color: '#e0e0ea' }}>First Week Tasks</h2>
          <div className="space-y-2">
            {docs.first_week_tasks.map((task, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3.5 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <span
                  className="text-xs w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 font-semibold"
                  style={{ background: 'rgba(124,111,255,0.15)', color: '#a78bfa', border: '1px solid rgba(124,111,255,0.25)' }}
                >
                  {i + 1}
                </span>
                <p className="text-sm leading-relaxed" style={{ color: '#a0a0b0' }}>{task}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {docs.glossary && Object.keys(docs.glossary).length > 0 && (
        <div>
          <h2 className="text-base font-semibold mb-3" style={{ color: '#e0e0ea' }}>Glossary</h2>
          <div className="space-y-2">
            {Object.entries(docs.glossary).map(([term, def]) => (
              <div
                key={term}
                className="p-3.5 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <span className="text-xs font-mono font-medium" style={{ color: '#a78bfa' }}>{term}</span>
                <p className="text-sm mt-1 leading-relaxed" style={{ color: '#6b6c80' }}>{def}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function formatConceptsAsMarkdown(docs: Documentation): string {
  let md = ''
  if (docs.key_concepts?.length) {
    md += '## Key Concepts\n\n'
    docs.key_concepts.forEach(c => { md += `- ${c}\n` })
    md += '\n'
  }
  if (docs.common_gotchas?.length) {
    md += '## Common Gotchas\n\n'
    docs.common_gotchas.forEach(c => { md += `- ${c}\n` })
    md += '\n'
  }
  return md
}
