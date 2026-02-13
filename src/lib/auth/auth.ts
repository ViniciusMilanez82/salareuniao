import { api, setToken, clearToken } from '../api/client'
import type { User } from '@/types/database.types'

interface LoginResponse {
  user: User
  workspaces: Array<{ id: string; name: string; slug: string; role: string }>
  token: string
}

interface MeResponse {
  user: User
  workspaces: Array<{ id: string; name: string; slug: string; role: string }>
}

export async function signInWithEmail(email: string, password: string) {
  const data = await api<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  setToken(data.token)
  return data
}

export async function signUpWithEmail(email: string, password: string, name: string, company?: string, jobTitle?: string) {
  const data = await api<LoginResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name, company, job_title: jobTitle }),
  })
  setToken(data.token)
  return data
}

export async function signOut() {
  clearToken()
}

export async function getCurrentUser(): Promise<MeResponse | null> {
  try {
    const data = await api<MeResponse>('/auth/me')
    return data
  } catch (err: unknown) {
    const status = (err as Error & { status?: number })?.status
    // Só retorna null quando o servidor responde 401 (token inválido/expirado)
    if (status === 401) return null
    // Erro de rede ou outro: repassa para o chamador decidir (não limpar token)
    throw err
  }
}

export async function updatePassword(currentPassword: string, newPassword: string) {
  await api('/auth/password', {
    method: 'PUT',
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  })
}

export async function resetPassword(_email: string) {
  throw new Error('Recuperação de senha será enviada por email quando configurado.')
}
