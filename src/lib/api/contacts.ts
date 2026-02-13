import { apiGet, apiPost, apiPut, apiDelete } from './client'
import type { Contact } from '@/types/database.types'

export async function fetchContacts(workspaceId: string) {
  return apiGet<Contact[]>(`/contacts?workspace_id=${workspaceId}`)
}

export async function createContact(contact: Partial<Contact>) {
  return apiPost<Contact>('/contacts', contact)
}

export async function updateContact(id: string, updates: Partial<Contact>) {
  return apiPut<Contact>(`/contacts/${id}`, updates)
}

export async function deleteContact(id: string) {
  return apiDelete(`/contacts/${id}`)
}
