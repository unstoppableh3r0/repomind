/**
 * RepoMind API Client
 * Typed wrappers around all backend endpoints
 */

import axios from 'axios'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

// ── Types ──────────────────────────────────────────────────────────────────────

export interface AnalyzeRequest {
  github_url: string
  branch?: string
  github_token?: string
}

export interface AnalyzeResponse {
  project_id: string
  status: string
  message: string
  estimated_time_seconds?: number
}

export interface AnalysisStatus {
  project_id: string
  status: 'pending' | 'cloning' | 'analyzing' | 'embedding' | 'complete' | 'failed'
  progress_percent: number
  current_step: string
  error_message?: string
}

export interface Project {
  id: string
  name: string
  github_url: string
  status: string
  created_at: string
}

export interface RepoStructure {
  project_id: string
  owner: string
  repo_name: string
  branch: string
  total_files: number
  total_lines: number
  size_mb: number
  languages: Array<{ name: string; percentage: number; file_count: number; line_count: number }>
  frameworks: string[]
  folder_tree: FileNode
}

export interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  language?: string
  size_bytes?: number
  children?: FileNode[]
}

export interface Architecture {
  project_id: string
  summary: {
    project_name: string
    description: string
    architecture_pattern: string
    tech_stack: string[]
    main_modules: Array<{ name: string; description: string; path: string }>
    key_features: string[]
    complexity_level: string
    onboarding_advice: string
  }
  architecture_summary: string
  layers: Array<{
    name: string
    description: string
    files: string[]
    responsibilities: string[]
  }>
  data_flow: string
  patterns_used: string[]
  graph: {
    nodes: GraphNode[]
    edges: GraphEdge[]
    metrics: { node_count: number; edge_count: number }
  }
}

export interface GraphNode {
  id: string
  type: string
  position: { x: number; y: number }
  data: {
    label: string
    nodeType: string
    filePath: string
    symbolCount: number
    color: string
  }
}

export interface GraphEdge {
  id: string
  source: string
  target: string
  label?: string
  type: string
  style?: Record<string, unknown>
  markerEnd?: Record<string, unknown>
}

export interface Workflow {
  id: string
  name: string
  description: string
  trigger: string
  steps: Array<{
    order: number
    name: string
    description: string
    file_path?: string
    function_name?: string
    type: string
  }>
  involved_files: string[]
  complexity: string
}

export interface ChatMessage {
  id?: string
  role: 'user' | 'assistant'
  content: string
  sources?: CodeSource[]
  created_at?: string
}

export interface CodeSource {
  file_path: string
  snippet: string
  start_line: number
  end_line: number
  relevance_score: number
}

export interface ChatResponse {
  message_id: string
  session_id: string
  answer: string
  sources: CodeSource[]
  follow_up_questions: string[]
}

export interface Documentation {
  project_id: string
  onboarding_guide: string
  architecture_overview: string
  setup_instructions: string
  key_concepts?: string[]
  glossary?: Record<string, string>
  first_week_tasks?: string[]
  common_gotchas?: string[]
}

// ── API Functions ──────────────────────────────────────────────────────────────

export const analyzeRepo = (data: AnalyzeRequest) =>
  api.post<AnalyzeResponse>('/analyze-repo', data).then(r => r.data)

export const getAnalysisStatus = (projectId: string) =>
  api.get<AnalysisStatus>(`/analyze-repo/${projectId}/status`).then(r => r.data)

export const listProjects = () =>
  api.get<{ projects: Project[] }>('/projects').then(r => r.data)

export const deleteProject = (projectId: string) =>
  api.delete(`/projects/${projectId}`).then(r => r.data)

export const getRepoStructure = (projectId: string) =>
  api.get<RepoStructure>(`/repo-structure/${projectId}`).then(r => r.data)

export const getArchitecture = (projectId: string) =>
  api.get<Architecture>(`/architecture/${projectId}`).then(r => r.data)

export const getWorkflows = (projectId: string) =>
  api.get<{ workflows: Workflow[] }>(`/workflows/${projectId}`).then(r => r.data)

export const getDocumentation = (projectId: string) =>
  api.get<Documentation>(`/docs/${projectId}`).then(r => r.data)

export const sendChatMessage = (data: {
  project_id: string
  message: string
  session_id?: string
}) => api.post<ChatResponse>('/chat', data).then(r => r.data)

export const getChatHistory = (projectId: string, sessionId?: string) =>
  api.get<{ messages: ChatMessage[] }>(`/chat/${projectId}/history`, {
    params: sessionId ? { session_id: sessionId } : {},
  }).then(r => r.data)

export const explainCode = (data: {
  project_id: string
  file_path: string
  function_name?: string
}) => api.post('/explain', data).then(r => r.data)
