import { apiGet, apiPost, apiPut, apiDelete } from './client'
import type { Deal } from '@/types/database.types'

export async function fetchDeals(workspaceId: string) {
  return apiGet<Deal[]>(`/deals?workspace_id=${workspaceId}`)
}

export async function fetchDeal(id: string) {
  return apiGet<Deal>(`/deals/${id}`)
}

export async function createDeal(deal: Partial<Deal>) {
  return apiPost<Deal>('/deals', deal)
}

export async function updateDeal(id: string, updates: Partial<Deal>) {
  return apiPut<Deal>(`/deals/${id}`, updates)
}

export async function deleteDeal(id: string) {
  return apiDelete(`/deals/${id}`)
}
