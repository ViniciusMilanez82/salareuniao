const API_URL = import.meta.env.VITE_API_URL || (
  import.meta.env.PROD ? '/api' : 'http://localhost:3001/api'
)

export function getToken(): string | null {
  return localStorage.getItem('auth_token')
}

export function setToken(token: string) {
  localStorage.setItem('auth_token', token)
}

export function clearToken() {
  localStorage.removeItem('auth_token')
}

export async function api<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Erro desconhecido' }))
    const err = new Error(error.error || `HTTP ${response.status}`) as Error & { status?: number }
    err.status = response.status
    throw err
  }

  return response.json()
}

export const apiGet = <T = unknown>(endpoint: string) => api<T>(endpoint)
export const apiPost = <T = unknown>(endpoint: string, data: unknown) =>
  api<T>(endpoint, { method: 'POST', body: JSON.stringify(data) })
export const apiPut = <T = unknown>(endpoint: string, data: unknown) =>
  api<T>(endpoint, { method: 'PUT', body: JSON.stringify(data) })
export const apiDelete = <T = unknown>(endpoint: string) =>
  api<T>(endpoint, { method: 'DELETE' })
