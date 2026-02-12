import { apiGet, apiPut, apiDelete } from './client'

export type IntegrationStatus = {
  provider: string
  label: string
  configured: boolean
  is_active: boolean
}

export async function fetchIntegrations(workspaceId: string) {
  return apiGet<IntegrationStatus[]>(`/integrations?workspace_id=${workspaceId}`)
}

export async function saveIntegration(workspaceId: string, provider: string, apiKey: string) {
  return apiPut(`/integrations/${provider}`, { workspace_id: workspaceId, api_key: apiKey })
}

export async function deleteIntegration(workspaceId: string, provider: string) {
  return apiDelete(`/integrations/${provider}?workspace_id=${workspaceId}`)
}
