'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Loader2, BookOpen, Download, Copy, Check, Sparkles } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { getDocumentation } from '@/lib/api'
import { useStore } from '@/lib/store'
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
        if (cached) {
          setLocalDocs(cached)
          return
        }
        const data = await getDocumentation(projectId)
        setDocs(projectId, data)
        setLocalDocs(data)
      } catch {
        setLocalDocs(null)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [projectId, storeDocs, setDocs])

  function activeContent(): string {
    if (!docs) return ''
    if (activeTab === 'onboarding') return docs.onboarding_guide || ''
    if (activeTab === 'architecture') return docs.architecture_overview || ''
    if (activeTab === 'setup') return docs.setup_instructions || ''
    return conceptsToMarkdown(docs)
  }

  async function copyContent() {
    const content = activeContent()
    if (!content) return
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  function downloadContent() {
    const content = activeContent()
    if (!content) return
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${activeTab}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="h-full w-full grid place-items-center">
        <Loader2 className="w-7 h-7 animate-spin text-[#9a8eff]" />
      </div>
    )
  }

  if (!docs) {
    return (
      <div className="h-full w-full grid place-items-center p-8 text-center">
        <div>
          <div className="w-16 h-16 mx-auto rounded-2xl grid place-items-center border border-white/10 bg-white/5 mb-4">
            <BookOpen className="w-7 h-7 text-[#6d6d84]" />
          </div>
          <h2 className="text-lg font-semibold text-[#ececf8] mb-1">Documentation unavailable</h2>
          <p className="text-sm text-[#7d7d93]">Ensure analysis finished and try again.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full w-full grid" style={{ gridTemplateRows: 'auto minmax(0,1fr)' }}>
      <header className="px-6 py-4 border-b border-white/10">
        <div className="rm-page-badge mb-3">
          <Sparkles className="w-3 h-3" />
          Analysis Docs
        </div>

        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="text-xl font-bold text-[#ececf8] tracking-tight">Documentation</h1>
            <p className="text-xs text-[#777792]">Generated developer guides and onboarding docs</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={copyContent}
              className="rounded-lg px-3 py-1.5 text-xs border transition-colors"
              style={{
                borderColor: copied ? 'rgba(52,211,153,.4)' : 'rgba(255,255,255,.14)',
                background: copied ? 'rgba(52,211,153,.14)' : 'rgba(255,255,255,.05)',
                color: copied ? '#34d399' : '#b2b2c6',
              }}
            >
              <span className="inline-flex items-center gap-1.5">
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </span>
            </button>
            <button
              onClick={downloadContent}
              className="rounded-lg px-3 py-1.5 text-xs border border-white/15 bg-white/5 text-[#b2b2c6] hover:border-white/25"
            >
              <span className="inline-flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5" />
                Download
              </span>
            </button>
          </div>
        </div>

        <div className="inline-flex p-1 rounded-xl border border-white/10 bg-white/5 gap-1">
          {TABS.map((tab) => {
            const active = tab.id === activeTab
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="px-3.5 py-1.5 rounded-lg text-xs border transition-colors"
                style={{
                  borderColor: active ? 'rgba(124,111,255,.35)' : 'transparent',
                  background: active ? 'rgba(124,111,255,.16)' : 'transparent',
                  color: active ? '#cbbfff' : '#8a8aa1',
                }}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      </header>

      <section className="min-h-0 overflow-y-auto px-6 py-6">
        <article className="rm-glass-panel p-5 max-w-4xl">
          {activeTab === 'concepts' ? (
            <ConceptsBlock docs={docs} />
          ) : (
            <MarkdownBlock content={activeContent()} />
          )}
        </article>
      </section>
    </div>
  )
}

function MarkdownBlock({ content }: { content: string }) {
  if (!content) return <p className="text-sm text-[#7d7d93]">No content available.</p>

  return (
    <div className="prose-repomind">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  )
}

function ConceptsBlock({ docs }: { docs: Documentation }) {
  return (
    <div className="space-y-8">
      {docs.key_concepts && docs.key_concepts.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-[#ececf8] mb-3">Key Concepts</h2>
          <div className="space-y-2">
            {docs.key_concepts.map((concept, index) => (
              <div key={index} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-[#b8b8c9]">
                {concept}
              </div>
            ))}
          </div>
        </section>
      )}

      {docs.common_gotchas && docs.common_gotchas.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-[#f5c66d] mb-3">Common Gotchas</h2>
          <div className="space-y-2">
            {docs.common_gotchas.map((gotcha, index) => (
              <div key={index} className="rounded-xl border border-[#f59e0b]/25 bg-[#f59e0b]/10 px-4 py-3 text-sm text-[#e8d3a8]">
                {gotcha}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function conceptsToMarkdown(docs: Documentation): string {
  const concepts = docs.key_concepts || []
  const gotchas = docs.common_gotchas || []
  const firstWeek = docs.first_week_tasks || []

  return [
    '# Key Concepts',
    ...concepts.map((c) => `- ${c}`),
    '',
    '# First Week Tasks',
    ...firstWeek.map((t) => `- ${t}`),
    '',
    '# Common Gotchas',
    ...gotchas.map((g) => `- ${g}`),
  ].join('\n')
}
