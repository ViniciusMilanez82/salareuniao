/**
 * Socket.IO: salas por reunião e emissão de eventos em tempo real (PRD 4.4.1).
 * Uso: emitToMeeting(meetingId, 'transcript', payload)
 */
import { Server as SocketIOServer } from 'socket.io'

let io: SocketIOServer | null = null

const ROOM_PREFIX = 'meeting:'

export function setIO(server: SocketIOServer) {
  io = server
}

export function getIO(): SocketIOServer | null {
  return io
}

/** Emite evento para todos os clientes na sala da reunião */
export function emitToMeeting(meetingId: string, event: string, payload: unknown) {
  if (!io) return
  io.to(ROOM_PREFIX + meetingId).emit(event, payload)
}
