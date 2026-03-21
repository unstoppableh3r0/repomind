'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Send, Loader2, Bot, User, Sparkles, FileCode2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { sendChatMessage, getChatHistory } from '@/lib/api'
import { useStore } from '@/lib/store'
import type { ChatMessage, CodeSource } from '@/lib/api'

const STARTER_QUESTIONS = [
  'How does authentication work in this codebase?',
  'What is the main entry point of the application?',
  'How is the database layer structured?',
  'Where are API routes defined?',
]

export default function ChatPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const { getChatSession } = useStore()

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [followUps, setFollowUps] = useState<string[]>([])
  const [sessionId, setSessionId] = useState('')
  const [focused, setFocused] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const session = getChatSession(projectId)
    setSessionId(session)
    getChatHistory(projectId, session)
      .then((data) => setMessages(data.messages))
      .catch(() => undefined)
  }, [projectId, getChatSession])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || loading) return

      setMessages((prev) => [
        ...prev,
        { role: 'user', content: text.trim(), created_at: new Date().toISOString() },
      ])
      setInput('')
      setFollowUps([])
      setLoading(true)

      try {
        const response = await sendChatMessage({
          project_id: projectId,
          message: text.trim(),
          session_id: sessionId,
        })

        setMessages((prev) => [
          ...prev,
          {
            id: response.message_id,
            role: 'assistant',
            content: response.answer,
            sources: response.sources,
            created_at: new Date().toISOString(),
          },
        ])
        setFollowUps(response.follow_up_questions || [])
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: 'Sorry, I hit an error. Please ensure analysis is complete and try again.',
            created_at: new Date().toISOString(),
          },
        ])
      } finally {
        setLoading(false)
        inputRef.current?.focus()
      }
    },
    [loading, projectId, sessionId]
  )

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <div style={{ height: '100%', width: '100%', display: 'grid', gridTemplateRows: 'auto minmax(0,1fr) auto' }}>
      <header style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
        <div className="rm-page-badge" style={{ marginBottom: '8px' }}>
          <Sparkles size={12} />
          AI Conversation
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(124,111,255,0.35)',
              background: 'rgba(124,111,255,0.15)',
            }}
          >
            <Bot size={16} color="#b6a9ff" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#ececf8' }}>Chat with Codebase</h1>
            <p style={{ margin: 0, marginTop: '2px', fontSize: '12px', color: '#777792' }}>Ask anything about the repository</p>
          </div>
        </div>
      </header>

      <section style={{ minHeight: 0, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {messages.length === 0 && (
          <div style={{ maxWidth: '760px' }}>
            <h2 style={{ margin: '0 0 16px', fontSize: '52px', lineHeight: 1.05, fontWeight: 800, color: '#f3f3ff', letterSpacing: '-0.04em' }}>Start a conversation</h2>
            <p style={{ margin: '0 0 20px', color: '#8d8da4' }}>
              Ask me anything about this codebase. I will answer with code-grounded responses.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: '10px' }}>
              {STARTER_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="rm-card"
                  style={{
                    textAlign: 'left',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    fontSize: '12px',
                    color: '#b7b7ca',
                    background: 'rgba(255,255,255,0.03)',
                    cursor: 'pointer',
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message, idx) => (
          <MessageBubble key={idx} message={message} />
        ))}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(124,111,255,0.35)',
                background: 'rgba(124,111,255,0.15)',
              }}
            >
              <Bot size={14} color="#b6a9ff" />
            </div>
            <div
              style={{
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.10)',
                background: 'rgba(255,255,255,0.05)',
                padding: '10px 14px',
                fontSize: '12px',
                color: '#8c8ca4',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Loader2 size={14} className="animate-spin" />
              Thinking...
            </div>
          </div>
        )}

        {followUps.length > 0 && !loading && (
          <div style={{ paddingLeft: '40px' }}>
            <p style={{ margin: '0 0 8px', fontSize: '11px', color: '#6f6f86' }}>Suggested follow-ups</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {followUps.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  style={{
                    borderRadius: '999px',
                    border: '1px solid rgba(255,255,255,0.10)',
                    background: 'rgba(255,255,255,0.05)',
                    padding: '6px 12px',
                    fontSize: '12px',
                    color: '#a6a6bc',
                    cursor: 'pointer',
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </section>

      <footer style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.10)' }}>
        <div
          style={{
            maxWidth: '760px',
            margin: '0 auto',
            borderRadius: '16px',
            border: focused ? '1px solid rgba(124,111,255,0.45)' : '1px solid rgba(255,255,255,0.12)',
            background: focused ? 'rgba(124,111,255,0.06)' : 'rgba(255,255,255,0.03)',
            padding: '8px',
            display: 'flex',
            alignItems: 'flex-end',
            gap: '8px',
          }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Ask about the codebase..."
            rows={1}
            style={{
              flex: 1,
              background: 'transparent',
              border: 0,
              outline: 'none',
              fontSize: '14px',
              color: '#ececf8',
              padding: '8px 12px',
              resize: 'none',
              maxHeight: '144px',
              overflowY: 'auto',
            }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              border: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
              background: loading || !input.trim() ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg,#7c6fff,#a78bfa)',
            }}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </footer>
    </div>
  )
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flexDirection: isUser ? 'row-reverse' : 'row' }}>
      <div
        style={{
          width: '28px',
          height: '28px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          background: isUser ? 'linear-gradient(135deg,#7c6fff,#a78bfa)' : 'rgba(255,255,255,0.10)',
          border: isUser ? 'none' : '1px solid rgba(255,255,255,0.15)',
        }}
      >
        {isUser ? <User size={14} color="#fff" /> : <Bot size={14} color="#b9b9cf" />}
      </div>

      <div style={{ maxWidth: '760px' }}>
        <div
          style={{
            padding: '12px 16px',
            fontSize: '14px',
            border: isUser ? '1px solid rgba(124,111,255,0.45)' : '1px solid rgba(255,255,255,0.10)',
            borderRadius: isUser ? '16px 6px 16px 16px' : '6px 16px 16px 16px',
            background: isUser ? 'rgba(124,111,255,0.35)' : 'rgba(255,255,255,0.05)',
            color: isUser ? '#fff' : '#d4d4e4',
          }}
        >
          {isUser ? (
            <p style={{ margin: 0 }}>{message.content}</p>
          ) : (
            <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose-repomind">
              {message.content}
            </ReactMarkdown>
          )}
        </div>

        {message.sources && message.sources.length > 0 && (
          <div style={{ marginTop: '8px', display: 'grid', gap: '6px' }}>
            <p style={{ margin: 0, fontSize: '11px', color: '#6f6f86' }}>Sources</p>
            {message.sources.slice(0, 3).map((source, idx) => (
              <SourceCard key={idx} source={source} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function SourceCard({ source }: { source: CodeSource }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <button
      onClick={() => setExpanded((v) => !v)}
      style={{
        width: '100%',
        textAlign: 'left',
        borderRadius: '10px',
        border: '1px solid rgba(255,255,255,0.10)',
        background: 'rgba(255,255,255,0.05)',
        padding: '8px 10px',
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
        <FileCode2 size={14} color="#74748c" />
        <span style={{ fontFamily: 'monospace', color: '#a8a8be', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {source.file_path}
        </span>
        <span style={{ color: '#6f6f86' }}>
          L{source.start_line}-{source.end_line}
        </span>
      </div>
      {expanded && source.snippet && (
        <pre
          style={{
            marginTop: '8px',
            fontSize: '11px',
            borderRadius: '8px',
            background: 'rgba(0,0,0,0.35)',
            border: '1px solid rgba(255,255,255,0.10)',
            padding: '10px',
            overflowX: 'auto',
            color: '#babacf',
          }}
        >
          {source.snippet}
        </pre>
      )}
    </button>
  )
}
