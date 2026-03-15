/**
 * RepoMind Global State - Zustand store
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Project, RepoStructure, Architecture, Workflow, Documentation } from './api'

interface ProjectState {
  // Current active project
  currentProjectId: string | null
  projects: Project[]

  // Cached analysis data per project
  structures: Record<string, RepoStructure>
  architectures: Record<string, Architecture>
  workflows: Record<string, Workflow[]>
  docs: Record<string, Documentation>

  // Chat session per project
  chatSessions: Record<string, string>

  // Actions
  setCurrentProject: (id: string | null) => void
  addProject: (project: Project) => void
  updateProject: (id: string, updates: Partial<Project>) => void
  removeProject: (id: string) => void
  setStructure: (projectId: string, data: RepoStructure) => void
  setArchitecture: (projectId: string, data: Architecture) => void
  setWorkflows: (projectId: string, data: Workflow[]) => void
  setDocs: (projectId: string, data: Documentation) => void
  getChatSession: (projectId: string) => string
}

export const useStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      currentProjectId: null,
      projects: [],
      structures: {},
      architectures: {},
      workflows: {},
      docs: {},
      chatSessions: {},

      setCurrentProject: (id) => set({ currentProjectId: id }),

      addProject: (project) =>
        set((s) => ({
          projects: [project, ...s.projects.filter(p => p.id !== project.id)],
        })),

      updateProject: (id, updates) =>
        set((s) => ({
          projects: s.projects.map(p => p.id === id ? { ...p, ...updates } : p),
        })),

      removeProject: (id) =>
        set((s) => ({
          projects: s.projects.filter(p => p.id !== id),
          structures: Object.fromEntries(Object.entries(s.structures).filter(([k]) => k !== id)),
          architectures: Object.fromEntries(Object.entries(s.architectures).filter(([k]) => k !== id)),
          workflows: Object.fromEntries(Object.entries(s.workflows).filter(([k]) => k !== id)),
          docs: Object.fromEntries(Object.entries(s.docs).filter(([k]) => k !== id)),
          currentProjectId: s.currentProjectId === id ? null : s.currentProjectId,
        })),

      setStructure: (projectId, data) =>
        set((s) => ({ structures: { ...s.structures, [projectId]: data } })),

      setArchitecture: (projectId, data) =>
        set((s) => ({ architectures: { ...s.architectures, [projectId]: data } })),

      setWorkflows: (projectId, data) =>
        set((s) => ({ workflows: { ...s.workflows, [projectId]: data } })),

      setDocs: (projectId, data) =>
        set((s) => ({ docs: { ...s.docs, [projectId]: data } })),

      getChatSession: (projectId) => {
        const state = get()
        if (!state.chatSessions[projectId]) {
          const newSession = `session_${Date.now()}`
          set((s) => ({
            chatSessions: { ...s.chatSessions, [projectId]: newSession },
          }))
          return newSession
        }
        return state.chatSessions[projectId]
      },
    }),
    {
      name: 'repomind-storage',
      partialize: (state) => ({
        currentProjectId: state.currentProjectId,
        projects: state.projects,
        chatSessions: state.chatSessions,
      }),
    }
  )
)
