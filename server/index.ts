import http from 'http'
import express from 'express'
import { Server as SocketIOServer } from 'socket.io'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import { setIO } from './socket.js'

dotenv.config()

const isProd = process.env.NODE_ENV === 'production'
if (isProd) {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'fallback-secret') {
    console.error('❌ Em produção defina a variável de ambiente JWT_SECRET (valor seguro e único).')
    process.exit(1)
  }
}

import { testConnection, pool, query } from './db.js'
import { verifyToken, canAccessWorkspace } from './middleware/auth.js'

// Routes
import authRoutes from './routes/auth.js'
import agentRoutes from './routes/agents.js'
import meetingRoutes from './routes/meetings.js'
import workspaceRoutes from './routes/workspace.js'
import integrationRoutes from './routes/integrations.js'
import contactsRoutes from './routes/contacts.js'
import dealsRoutes from './routes/deals.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = parseInt(process.env.PORT || '3001')

// Trust proxy (Nginx na frente) — necessário para rate-limit funcionar
app.set('trust proxy', 1)

// Middleware — RS-003: em produção CORS restritivo (sem *)
if (isProd && !process.env.CORS_ORIGIN) {
  console.warn('⚠️ CORS_ORIGIN não definido em produção. Defina com o domínio do frontend (ex: http://187.77.32.67).')
}
app.use(cors({
  origin: isProd
    ? (process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map((o: string) => o.trim()).filter(Boolean) : ['http://localhost:5173'])
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}))
app.use(express.json({ limit: '10mb' }))
app.use(cookieParser())

// Logging middleware
app.use((req, _res, next) => {
  const start = Date.now()
  _res.on('finish', () => {
    const ms = Date.now() - start
    if (req.path.startsWith('/api')) {
      console.log(`${req.method} ${req.path} ${_res.statusCode} ${ms}ms`)
    }
  })
  next()
})

// Health check
app.get('/api/health', (_req, res) => {
  pool.query('SELECT NOW() as now')
    .then((result) => {
      return res.json({ status: 'ok', database: 'connected', timestamp: result.rows[0].now })
    })
    .catch((err) => {
      return res.json({ status: 'degraded', database: 'disconnected', error: err.message })
    })
})

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/agents', agentRoutes)
app.use('/api/meetings', meetingRoutes)
app.use('/api/workspaces', workspaceRoutes)
app.use('/api/integrations', integrationRoutes)
app.use('/api/contacts', contactsRoutes)
app.use('/api/deals', dealsRoutes)

// Servir frontend em produção (dev: server/ -> ../dist; prod: server/dist/ -> ../../dist)
if (isProd) {
  const distPath = __dirname.endsWith(path.sep + 'dist')
    ? path.join(__dirname, '..', '..', 'dist')
    : path.join(__dirname, '..', 'dist')
  app.use(express.static(distPath))
  // SPA fallback: qualquer rota que não seja /api retorna o index.html
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
} else {
  // 404 em dev: rotas /api não encontradas
  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: 'Rota não encontrada' })
    }
    res.status(404).send('Frontend não servido em dev. Rode npm run dev e acesse http://localhost:5173')
  })
}

// Error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Erro não tratado:', err)
  res.status(500).json({ error: 'Erro interno do servidor' })
})

// HTTP server (para anexar Socket.IO)
const server = http.createServer(app)

// Socket.IO — tempo real por sala de reunião; RS-006: auth JWT
const io = new SocketIOServer(server, {
  path: '/socket.io',
  cors: {
    origin: isProd
      ? (process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map((o: string) => o.trim()).filter(Boolean) : ['http://localhost:5173'])
      : ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
  },
})
io.use(async (socket, next) => {
  const token = (socket.handshake.auth?.token as string) || (socket.handshake.query?.token as string)
  const room = socket.handshake.query.room as string
  if (!token) {
    return next(new Error('Token não fornecido'))
  }
  if (!room) {
    return next(new Error('Sala (room) não informada'))
  }
  try {
    const decoded = verifyToken(token)
    const meeting = await query('SELECT workspace_id FROM meetings WHERE id = $1', [room])
    if (meeting.rows.length === 0) return next(new Error('Reunião não encontrada'))
    const allowed = await canAccessWorkspace(meeting.rows[0].workspace_id, decoded.id)
    if (!allowed) return next(new Error('Sem acesso a esta reunião'))
    ;(socket as any).userId = decoded.id
    next()
  } catch (err) {
    next(new Error('Token inválido ou expirado'))
  }
})
io.on('connection', (socket) => {
  const room = socket.handshake.query.room as string
  if (room) {
    socket.join('meeting:' + room)
  }
})
setIO(io)

// Start
server.listen(PORT, '0.0.0.0', async () => {
  console.log(`\n🚀 Servidor rodando em http://0.0.0.0:${PORT}`)
  console.log(`📡 API disponível em http://0.0.0.0:${PORT}/api`)
  console.log(`🔌 Socket.IO em /socket.io`)
  console.log(`🌍 Modo: ${isProd ? 'PRODUÇÃO' : 'DESENVOLVIMENTO'}`)
  await testConnection()
  console.log('')
})
