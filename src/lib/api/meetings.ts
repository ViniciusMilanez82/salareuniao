import { apiGet, apiPost, apiPut, apiDelete } from './client'
import type { Meeting, Transcript, ActionItem } from '@/types/database.types'

export async function fetchMeetings(workspaceId: string, status?: string) {
  const params = new URLSearchParams({ workspace_id: workspaceId })
  if (status) params.append('status', status)
  return apiGet<Meeting[]>(`/meetings?${params}`)
}

export async function fetchMeeting(id: string) {
  return apiGet<Meeting & { agents: unknown[]; transcripts: Transcript[]; action_items: ActionItem[] }>(`/meetings/${id}`)
}

export async function createMeeting(meeting: Partial<Meeting> & { agent_ids?: string[] }) {
  return apiPost<Meeting>('/meetings', meeting)
}

export async function updateMeeting(id: string, updates: Partial<Meeting>) {
  return apiPut<Meeting>(`/meetings/${id}`, updates)
}

export async function deleteMeeting(id: string) {
  return apiDelete(`/meetings/${id}`)
}

export async function startMeeting(id: string) {
  return apiPost<Meeting>(`/meetings/${id}/start`, {})
}

export async function pauseMeeting(id: string) {
  return apiPost<Meeting>(`/meetings/${id}/pause`, {})
}

export async function resumeMeeting(id: string) {
  return apiPost<Meeting>(`/meetings/${id}/resume`, {})
}

export async function endMeeting(id: string, summary?: string) {
  return apiPost<Meeting>(`/meetings/${id}/end`, { summary })
}

export async function runMeetingTurn(id: string, provider: 'openai' | 'anthropic' = 'openai') {
  return apiPost<{ transcript: { sequence_number: number; speaker_name: string; speaker_id: string; content: string } }>(
    `/meetings/${id}/run-turn`,
    { provider }
  )
}

export async function addAgentToMeeting(meetingId: string, agentId: string) {
  return apiPost(`/meetings/${meetingId}/agents`, { agent_id: agentId })
}

export async function removeAgentFromMeeting(meetingId: string, agentId: string) {
  return apiDelete(`/meetings/${meetingId}/agents/${agentId}`)
}

export async function fetchTranscripts(meetingId: string) {
  return apiGet<Transcript[]>(`/meetings/${meetingId}/transcripts`)
}

export async function addTranscript(meetingId: string, transcript: Partial<Transcript>) {
  return apiPost<Transcript>(`/meetings/${meetingId}/transcripts`, transcript)
}

export async function fetchActionItems(meetingId: string) {
  return apiGet<ActionItem[]>(`/meetings/${meetingId}/action_items`)
}
