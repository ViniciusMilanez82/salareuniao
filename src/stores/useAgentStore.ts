import { create } from 'zustand'
import type { AIAgent } from '@/types/database.types'

interface AgentState {
  agents: AIAgent[]
  selectedAgent: AIAgent | null
  isLoading: boolean
  searchQuery: string
  filterTags: string[]
  setAgents: (agents: AIAgent[]) => void
  setSelectedAgent: (agent: AIAgent | null) => void
  setLoading: (loading: boolean) => void
  setSearchQuery: (query: string) => void
  setFilterTags: (tags: string[]) => void
  addAgent: (agent: AIAgent) => void
  updateAgent: (id: string, updates: Partial<AIAgent>) => void
  removeAgent: (id: string) => void
}

export const useAgentStore = create<AgentState>()((set) => ({
  agents: [],
  selectedAgent: null,
  isLoading: false,
  searchQuery: '',
  filterTags: [],
  setAgents: (agents) => set({ agents }),
  setSelectedAgent: (selectedAgent) => set({ selectedAgent }),
  setLoading: (isLoading) => set({ isLoading }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setFilterTags: (filterTags) => set({ filterTags }),
  addAgent: (agent) => set((state) => ({ agents: [agent, ...state.agents] })),
  updateAgent: (id, updates) => set((state) => ({
    agents: state.agents.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    selectedAgent: state.selectedAgent?.id === id ? { ...state.selectedAgent, ...updates } as AIAgent : state.selectedAgent,
  })),
  removeAgent: (id) => set((state) => ({
    agents: state.agents.filter((a) => a.id !== id),
    selectedAgent: state.selectedAgent?.id === id ? null : state.selectedAgent,
  })),
}))
