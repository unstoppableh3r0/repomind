import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

export function getLanguageColor(language: string): string {
  const colors: Record<string, string> = {
    'Python': '#3572A5',
    'JavaScript': '#f1e05a',
    'TypeScript': '#2b7489',
    'JavaScript (React)': '#61dafb',
    'TypeScript (React)': '#2b7489',
    'Java': '#b07219',
    'Go': '#00ADD8',
    'Rust': '#dea584',
    'Ruby': '#701516',
    'PHP': '#4F5D95',
    'C++': '#f34b7d',
    'C': '#555555',
    'C#': '#178600',
    'Swift': '#FA7343',
    'Kotlin': '#A97BFF',
    'HTML': '#e34c26',
    'CSS': '#563d7c',
    'SCSS': '#c6538c',
    'Shell': '#89e051',
    'SQL': '#e38c00',
    'Vue': '#41b883',
    'Svelte': '#ff3e00',
  }
  return colors[language] || '#6366f1'
}

export function getNodeTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    api: '🔌',
    database: '🗄️',
    service: '⚙️',
    config: '🔧',
    utility: '🛠️',
    middleware: '🔀',
    test: '🧪',
    module: '📦',
  }
  return icons[type] || '📄'
}

export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str
  return str.slice(0, maxLen - 3) + '...'
}

export function extractRepoName(url: string): string {
  const parts = url.replace('.git', '').split('/')
  return parts.slice(-2).join('/')
}

export function timeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export const WORKFLOW_TYPE_COLORS: Record<string, string> = {
  route: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  service: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  database: 'bg-green-500/20 text-green-400 border-green-500/30',
  validation: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  external: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
}
