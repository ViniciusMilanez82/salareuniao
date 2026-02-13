/**
 * Tempo real via Socket.IO (PRD 4.4.1 — RF-WS-001/002). RS-006: auth com JWT.
 */
import { io, Socket } from 'socket.io-client'
import { getToken } from '@/lib/api/client'

function getSocketBaseUrl(): string {
  const wsUrl = import.meta.env.VITE_WS_URL as string | undefined
  if (wsUrl?.startsWith('ws://')) return wsUrl.replace('ws://', 'http://').replace(/\/ws.*/, '')
  if (wsUrl?.startsWith('wss://')) return wsUrl.replace('wss://', 'https://').replace(/\/ws.*/, '')
  const apiUrl = import.meta.env.VITE_API_URL as string | undefined
  if (apiUrl) return apiUrl.replace(/\/api\/?$/, '') // base URL sem /api para Socket.IO
  return window.location.origin
}

let socket: Socket | null = null

export function connectMeetingRoom(roomId: string, callbacks: {
  onTranscript?: (data: unknown) => void
  onAgentStatus?: (data: unknown) => void
  onMeetingStatus?: (data: unknown) => void
  onDisconnect?: () => void
  onReconnect?: () => void
}) {
  const token = getToken()
  socket = io(getSocketBaseUrl(), {
    path: '/socket.io',
    query: { room: roomId },
    auth: { token: token || '' },
    transports: ['websocket', 'polling'],
  })

  socket.on('transcript', (data: unknown) => {
    callbacks.onTranscript?.(data)
  })
  socket.on('agent_status', (data: unknown) => {
    callbacks.onAgentStatus?.(data)
  })
  socket.on('meeting_status', (data: unknown) => {
    callbacks.onMeetingStatus?.(data)
  })
  socket.on('connect_error', (err) => {
    console.warn('Socket.IO: falha ao conectar', err.message)
    callbacks.onDisconnect?.()
  })
  socket.on('disconnect', (reason) => {
    if (reason === 'io server disconnect' || reason === 'io client disconnect') return
    callbacks.onDisconnect?.()
  })
  socket.io.on('reconnect', () => {
    callbacks.onReconnect?.()
  })

  return socket
}

export function disconnectMeetingRoom() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

export function sendModeratorMessage(content: string) {
  if (socket?.connected) {
    socket.emit('moderator_message', content)
  }
}
