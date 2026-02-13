import { apiGet } from './client'

export interface WorkspaceMember {
  id: string
  user_id: string
  role: string
  email: string
  name: string
  avatar_url?: string | null
  last_active_at?: string | null
  user_active?: boolean
}

export async function fetchWorkspaceMembers(workspaceId: string) {
  return apiGet<WorkspaceMember[]>(`/workspaces/${workspaceId}/members`)
}
