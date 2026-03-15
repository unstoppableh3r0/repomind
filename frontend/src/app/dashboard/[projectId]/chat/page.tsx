'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Send, Loader2, FileCode2, Bot, User, Sparkles } from 'lucide-react'
import { sendChatMessage, getChatHistory } from '@/lib/api'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { ChatMessage, CodeSource } from '@/lib/api'

const STARTER_QUESTIONS = [
  'How does authentication work in this codebase?',
  'What is the main entry point of the application?',
  'How is the database layer structured?',
  'Where are API routes defined?',
  'What are the main services and what do they do?',
  'How is error handling implemented?',
]

export default function ChatPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const { getChatSession } = useStore()

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [followUps, setFollowUps] = useState<string[]>([])
  const [sessionId, setSessionId] = useState<string>('')
  const [inputFocused, setInputFocused] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const session = getChatSession(projectId)
    setSessionId(session)
    getChatHistory(projectId, session)
      .then(data => setMessages(data.messages))
      .catch(() => { })
  }, [projectId, getChatSession])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return

    const userMsg: ChatMessage = {
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setFollowUps([])
    setLoading(true)

    try {
      const response = await sendChatMessage({
        project_id: projectId,
        message: text,
        session_id: sessionId,
      })

      const assistantMsg: ChatMessage = {
        id: response.message_id,
        role: 'assistant',
        content: response.answer,
        sources: response.sources,
        created_at: new Date().toISOString(),
      }
      setMessages(prev => [...prev, assistantMsg])
      setFollowUps(response.follow_up_questions || [])
    } catch (err: any) {
      const errMsg: ChatMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please check that the analysis is complete and try again.',
        created_at: new Date().toISOString(),
      }
      setMessages(prev => [...prev, errMsg])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }, [projectId, sessionId, loading])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <div className="flex flex-col h-screen">

      {/* Header */}
      <div
        className="flex-shrink-0 px-6 py-4 flex items-center gap-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, rgba(124,111,255,0.2) 0%, rgba(167,139,250,0.15) 100%)', border: '1px solid rgba(124,111,255,0.2)' }}
        >
          <Bot className="w-4 h-4" style={{ color: '#a78bfa' }} />
        </div>
        <div>
          <h1 className="font-semibold text-sm" style={{ color: '#e0e0ea' }}>Chat with Codebase</h1>
          <p className="text-xs" style={{ color: '#4a4b60' }}>Ask any question about this repository</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {messages.length === 0 && (
          <div className="text-center py-16 animate-fade-in">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
              style={{
                background: 'linear-gradient(135deg, rgba(124,111,255,0.12) 0%, rgba(167,139,250,0.08) 100%)',
                border: '1px solid rgba(124,111,255,0.2)',
                boxShadow: '0 0 32px rgba(124,111,255,0.1)',
              }}
            >
              <Sparkles className="w-7 h-7" style={{ color: '#a78bfa' }} />
            </div>
            <h2 className="font-semibold text-lg mb-2" style={{ color: '#e0e0ea' }}>Start a conversation</h2>
            <p className="text-sm mb-8 max-w-sm mx-auto" style={{ color: '#5a5b70' }}>
              Ask me anything about this codebase. I'll search the code and provide grounded answers with file references.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg mx-auto">
              {STARTER_QUESTIONS.map((q, i) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-left px-4 py-3 rounded-xl text-xs font-medium transition-all duration-150"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    color: '#8B8C9E',
                    animation: `fade-up 0.4s ease-out ${i * 0.06}s both`,
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(124,111,255,0.08)'
                      ; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(124,111,255,0.25)'
                      ; (e.currentTarget as HTMLElement).style.color = '#c4b5fd'
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'
                      ; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)'
                      ; (e.currentTarget as HTMLElement).style.color = '#8B8C9E'
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex items-start gap-3 animate-fade-in">
            <div
              className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ background: 'rgba(124,111,255,0.12)', border: '1px solid rgba(124,111,255,0.2)' }}
            >
              <Bot className="w-3.5 h-3.5" style={{ color: '#a78bfa' }} />
            </div>
            <div
              className="flex items-center gap-1.5 px-4 py-3 rounded-2xl rounded-tl-sm"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background: '#a78bfa',
                    animation: `bounce-dot 1.2s ease-in-out ${i * 0.15}s infinite`,
                  }}
                />
              ))}
              <span className="text-xs ml-1" style={{ color: '#4a4b60' }}>Searching code…</span>
            </div>
          </div>
        )}

        {/* Follow-up questions */}
        {followUps.length > 0 && !loading && (
          <div className="pl-10 animate-fade-in">
            <p className="text-[11px] mb-2" style={{ color: '#3d3e52' }}>Suggested follow-ups:</p>
            <div className="flex flex-wrap gap-2">
              {followUps.map(q => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-xs px-3 py-1.5 rounded-full transition-all duration-150"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: '#6b6c80',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(124,111,255,0.35)'
                      ; (e.currentTarget as HTMLElement).style.color = '#a78bfa'
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)'
                      ; (e.currentTarget as HTMLElement).style.color = '#6b6c80'
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div
        className="flex-shrink-0 p-4"
        style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div
          className="flex items-end gap-2 max-w-3xl mx-auto rounded-2xl p-2 transition-all duration-200"
          style={{
            background: inputFocused ? 'rgba(124,111,255,0.05)' : 'rgba(255,255,255,0.03)',
            border: inputFocused ? '1px solid rgba(124,111,255,0.35)' : '1px solid rgba(255,255,255,0.07)',
            boxShadow: inputFocused ? '0 0 0 3px rgba(124,111,255,0.08)' : 'none',
          }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            placeholder="Ask about the codebase…"
            rows={1}
            className="flex-1 px-3 py-2 text-sm resize-none max-h-32 overflow-y-auto transition-colors"
            style={{
              background: 'transparent',
              outline: 'none',
              border: 'none',
              color: '#f0f0f5',
              caretColor: '#a78bfa',
              minHeight: '36px',
            }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            className="p-2.5 rounded-xl transition-all duration-150 flex-shrink-0"
            style={{
              background: loading || !input.trim() ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #7c6fff 0%, #a78bfa 100%)',
              color: loading || !input.trim() ? '#3d3e52' : '#fff',
              boxShadow: loading || !input.trim() ? 'none' : '0 0 16px rgba(124,111,255,0.35)',
            }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-center text-[11px] mt-2" style={{ color: '#2d2e3a' }}>
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'

  return (
    <div className={cn('flex items-start gap-3 animate-fade-in', isUser && 'flex-row-reverse')}>
      {/* Avatar */}
      <div
        className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
        style={
          isUser
            ? { background: 'linear-gradient(135deg, #7c6fff 0%, #a78bfa 100%)' }
            : { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }
        }
      >
        {isUser ? (
          <User className="w-3.5 h-3.5 text-white" />
        ) : (
          <Bot className="w-3.5 h-3.5" style={{ color: '#8B8C9E' }} />
        )}
      </div>

      <div className={cn('max-w-2xl', isUser ? 'items-end' : 'items-start')}>
        <div
          className="px-4 py-3 rounded-2xl text-sm"
          style={
            isUser
              ? {
                background: 'linear-gradient(135deg, rgba(124,111,255,0.5) 0%, rgba(107,82,245,0.5) 100%)',
                borderRadius: '18px 18px 4px 18px',
                color: '#fff',
                border: '1px solid rgba(124,111,255,0.3)',
              }
              : {
                background: 'rgba(255,255,255,0.04)',
                borderRadius: '4px 18px 18px 18px',
                color: '#d0d0e0',
                border: '1px solid rgba(255,255,255,0.08)',
              }
          }
        >
          {isUser ? (
            <p>{message.content}</p>
          ) : (
            <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose-repomind">
              {message.content}
            </ReactMarkdown>
          )}
        </div>

        {/* Sources */}
        {message.sources && message.sources.length > 0 && (
          <div className="mt-2 space-y-1">
            <p className="text-[11px] pl-1" style={{ color: '#3d3e52' }}>Sources:</p>
            {message.sources.slice(0, 3).map((src, i) => (
              <SourceCard key={i} source={src} />
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
      onClick={() => setExpanded(!expanded)}
      className="w-full text-left px-3 py-2 rounded-xl text-xs transition-all duration-150"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
      }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.12)'}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)'}
    >
      <div className="flex items-center gap-2">
        <FileCode2 className="w-3 h-3 flex-shrink-0" style={{ color: '#4a4b60' }} />
        <span className="font-mono truncate" style={{ color: '#8B8C9E' }}>{source.file_path}</span>
        <span className="ml-auto font-mono" style={{ color: '#3d3e52' }}>L{source.start_line}–{source.end_line}</span>
        <span className="font-medium" style={{ color: '#7c6fff' }}>{Math.round(source.relevance_score * 100)}%</span>
      </div>
      {expanded && source.snippet && (
        <pre
          className="mt-2 p-2.5 rounded-lg overflow-x-auto text-[11px] leading-relaxed"
          style={{ background: 'rgba(0,0,0,0.3)', color: '#b0b0c0' }}
        >
          {source.snippet}
        </pre>
      )}
    </button>
  )
}
