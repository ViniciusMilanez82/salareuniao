// ============================================================
// Realtime via WebSocket próprio (substituiu Supabase Realtime)
// ============================================================

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001/ws'

let socket: WebSocket | null = null

export function connectMeetingRoom(roomId: string, callbacks: {
  onTranscript?: (data: unknown) => void
  onAgentStatus?: (data: unknown) => void
  onMeetingStatus?: (data: unknown) => void
}) {
  socket = new WebSocket(`${WS_URL}?room=${roomId}`)

  socket.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data)
      switch (message.type) {
        case 'transcript':
          callbacks.onTranscript?.(message.data)
          break
        case 'agent_status':
          callbacks.onAgentStatus?.(message.data)
          break
        case 'meeting_status':
          callbacks.onMeetingStatus?.(message.data)
          break
      }
    } catch (err) {
      console.error('Erro ao processar mensagem WS:', err)
    }
  }

  socket.onclose = () => {
    console.log('WebSocket desconectado')
  }

  return socket
}

export function disconnectMeetingRoom() {
  if (socket) {
    socket.close()
    socket = null
  }
}

export function sendModeratorMessage(content: string) {
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: 'moderator_message', content }))
  }
}
