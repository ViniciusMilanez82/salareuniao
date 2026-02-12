import { apiGet, apiPost, apiPut, apiDelete } from './client'
import type { AIAgent, AgentKnowledge } from '@/types/database.types'

export async function fetchAgents(workspaceId: string, search?: string) {
  const params = new URLSearchParams({ workspace_id: workspaceId })
  if (search) params.append('search', search)
  return apiGet<AIAgent[]>(`/agents?${params}`)
}

export async function fetchAgent(id: string) {
  return apiGet<AIAgent>(`/agents/${id}`)
}

export async function createAgent(agent: Partial<AIAgent>) {
  return apiPost<AIAgent>('/agents', agent)
}

export async function updateAgent(id: string, updates: Partial<AIAgent>) {
  return apiPut<AIAgent>(`/agents/${id}`, updates)
}

export async function deleteAgent(id: string) {
  return apiDelete(`/agents/${id}`)
}

export async function duplicateAgent(id: string) {
  return apiPost<AIAgent>(`/agents/${id}/duplicate`, {})
}

export async function fetchAgentKnowledge(agentId: string) {
  return apiGet<AgentKnowledge[]>(`/agents/${agentId}/knowledge`)
}

export async function addAgentKnowledge(agentId: string, knowledge: {
  title: string; content: string; category?: string; tags?: string[]; source_type?: string
}) {
  return apiPost(`/agents/${agentId}/knowledge`, knowledge)
}
