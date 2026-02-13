import { Router, Response } from 'express'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'
import { query } from '../db.js'
import { authMiddleware, AuthRequest, canAccessWorkspace } from '../middleware/auth.js'
import { validateUuidParam } from '../middleware/validateUuid.js'
import { validateRequest } from '../middleware/validateRequest.js'
import { emitToMeeting } from '../socket.js'

const createMeetingSchema = z.object({
  body: z.object({
    workspace_id: z.string().uuid('workspace_id inválido'),
    title: z.string().min(1, 'Título é obrigatório'),
    topic: z.string().min(5, 'O tópico deve ter pelo menos 5 caracteres').optional(),
    agent_ids: z.array(z.string().uuid('ID de agente inválido')).optional(),
    description: z.string().optional(),
    objectives: z.any().optional(),
    meeting_type: z.string().optional(),
    scheduled_start: z.string().optional(),
    scheduled_end: z.string().optional(),
    agenda: z.any().optional(),
    parameters: z.any().optional(),
    settings: z.any().optional(),
    tags: z.array(z.any()).optional(),
  }),
})

const router = Router()
router.use(authMiddleware)

// RS-004: rate limit em rotas que consomem LLM (10 req/min por usuário)
const runTurnLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: (req) => (req as AuthRequest).user?.id ?? (req as any).ip ?? 'anon',
  message: { error: 'Muitas requisições ao debate. Aguarde 1 minuto.' },
  standardHeaders: true,
  legacyHeaders: false,
})
router.param('id', validateUuidParam)
router.param('agentId', validateUuidParam)

// GET /api/meetings?workspace_id=xxx
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { workspace_id, status, meeting_type } = req.query
    if (!workspace_id) return res.status(400).json({ error: 'workspace_id obrigatório' })
    if (!req.user?.id) return res.status(401).json({ error: 'Não autenticado' })
    const allowed = await canAccessWorkspace(workspace_id as string, req.user.id)
    if (!allowed) return res.status(403).json({ error: 'Sem acesso a este workspace' })

    let sql = `
      SELECT m.*,
        (SELECT COUNT(*) FROM meeting_agents ma WHERE ma.meeting_id = m.id)::int as agent_count,
        (SELECT COUNT(*) FROM meeting_participants mp WHERE mp.meeting_id = m.id)::int as participant_count,
        u.name as creator_name, u.avatar_url as creator_avatar
      FROM meetings m
      LEFT JOIN users u ON u.id = m.created_by
      WHERE m.workspace_id = $1`
    const params: unknown[] = [workspace_id]
    let idx = 2

    if (status) {
      sql += ` AND m.status = $${idx}`
      params.push(status)
      idx++
    }
    if (meeting_type) {
      sql += ` AND m.meeting_type = $${idx}`
      params.push(meeting_type)
      idx++
    }

    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || '20', 10)))
    const offset = (page - 1) * limit

    sql += ` ORDER BY m.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`
    params.push(limit, offset)

    const result = await query(sql, params)
    return res.json(result.rows)
  } catch (err: unknown) {
    console.error('Erro ao listar sessões:', err instanceof Error ? err.message : err)
    return res.status(500).json({ error: 'Erro interno' })
  }
})

// GET /api/meetings/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const meetingRes = await query('SELECT * FROM meetings WHERE id = $1', [req.params.id])
    if (meetingRes.rows.length === 0) return res.status(404).json({ error: 'Sessão não encontrada' })
    const meeting = meetingRes.rows[0]
    if (!req.user?.id) return res.status(401).json({ error: 'Não autenticado' })
    const allowed = await canAccessWorkspace(meeting.workspace_id, req.user.id)
    if (!allowed) return res.status(403).json({ error: 'Sem acesso a este workspace' })

    const [agentsRes, participantsRes, transcriptsRes, actionsRes] = await Promise.all([
      query(`SELECT ma.*, a.name as agent_name, a.role as agent_role, a.avatar_url as agent_avatar,
                    a.personality_traits, a.voice_settings
             FROM meeting_agents ma JOIN ai_agents a ON a.id = ma.agent_id
             WHERE ma.meeting_id = $1 ORDER BY ma.speaking_order`, [req.params.id]),
      query(`SELECT mp.*, u.name as user_name, u.email as user_email, u.avatar_url as user_avatar
             FROM meeting_participants mp
             LEFT JOIN users u ON u.id = mp.user_id
             WHERE mp.meeting_id = $1`, [req.params.id]),
      query('SELECT * FROM transcripts WHERE meeting_id = $1 ORDER BY sequence_number', [req.params.id]),
      query('SELECT * FROM action_items WHERE meeting_id = $1 ORDER BY created_at', [req.params.id]),
    ])

    return res.json({
      ...meeting,
      agents: agentsRes.rows,
      participants: participantsRes.rows,
      transcripts: transcriptsRes.rows,
      action_items: actionsRes.rows,
    })
  } catch (err: unknown) {
    return res.status(500).json({ error: 'Erro interno' })
  }
})

// POST /api/meetings
router.post('/', validateRequest(createMeetingSchema), async (req: AuthRequest, res: Response) => {
  try {
    const {
      workspace_id, title, description, topic, objectives, meeting_type,
      scheduled_start, scheduled_end, agenda, parameters, settings, tags, agent_ids
    } = req.body

    if (!req.user?.id) return res.status(401).json({ error: 'Não autenticado' })
    const allowed = await canAccessWorkspace(workspace_id, req.user.id)
    if (!allowed) return res.status(403).json({ error: 'Sem acesso a este workspace' })

    const result = await query(
      `INSERT INTO meetings (
        workspace_id, created_by, moderator_id, title, description, topic, objectives,
        meeting_type, status, scheduled_start, scheduled_end, agenda, parameters, settings, tags
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        workspace_id, req.user!.id, req.user!.id, title, description || null,
        topic || null, JSON.stringify(objectives || []),
        meeting_type || 'debate', 'draft',
        scheduled_start || null, scheduled_end || null,
        JSON.stringify(agenda || []),
        JSON.stringify(parameters || {}),
        JSON.stringify(settings || {}),
        tags || [],
      ]
    )

    const meeting = result.rows[0]

    // Adicionar agentes se fornecidos
    if (agent_ids && Array.isArray(agent_ids)) {
      for (let i = 0; i < agent_ids.length; i++) {
        await query(
          `INSERT INTO meeting_agents (meeting_id, agent_id, role_in_meeting, speaking_order)
           VALUES ($1, $2, 'participant', $3)`,
          [meeting.id, agent_ids[i], i + 1]
        )
      }
    }

    return res.status(201).json(meeting)
  } catch (err: unknown) {
    console.error('Erro ao criar sessão:', err)
    return res.status(500).json({ error: 'Erro interno' })
  }
})

// PUT /api/meetings/:id
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const meetingRow = await query('SELECT workspace_id FROM meetings WHERE id = $1', [req.params.id])
    if (meetingRow.rows.length === 0) return res.status(404).json({ error: 'Sessão não encontrada' })
    if (!req.user?.id) return res.status(401).json({ error: 'Não autenticado' })
    const allowed = await canAccessWorkspace(meetingRow.rows[0].workspace_id, req.user.id)
    if (!allowed) return res.status(403).json({ error: 'Sem acesso a este workspace' })

    const fields = ['title', 'description', 'topic', 'meeting_type', 'status',
      'scheduled_start', 'scheduled_end', 'actual_start', 'actual_end',
      'summary', 'tags']
    const jsonFields = ['objectives', 'agenda', 'parameters', 'settings', 'key_decisions']

    const updates: string[] = []
    const params: unknown[] = []
    let idx = 1

    for (const field of fields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = $${idx}`)
        params.push(req.body[field])
        idx++
      }
    }
    for (const field of jsonFields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = $${idx}`)
        params.push(JSON.stringify(req.body[field]))
        idx++
      }
    }

    if (updates.length === 0) return res.status(400).json({ error: 'Nada para atualizar' })

    params.push(req.params.id)
    const result = await query(
      `UPDATE meetings SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    )

    if (result.rows.length === 0) return res.status(404).json({ error: 'Sessão não encontrada' })
    return res.json(result.rows[0])
  } catch (err: unknown) {
    return res.status(500).json({ error: 'Erro interno' })
  }
})

// POST /api/meetings/:id/start
router.post('/:id/start', async (req: AuthRequest, res: Response) => {
  try {
    const meetingRow = await query('SELECT workspace_id FROM meetings WHERE id = $1', [req.params.id])
    if (meetingRow.rows.length === 0) return res.status(404).json({ error: 'Sessão não encontrada' })
    if (!req.user?.id) return res.status(401).json({ error: 'Não autenticado' })
    const allowed = await canAccessWorkspace(meetingRow.rows[0].workspace_id, req.user.id)
    if (!allowed) return res.status(403).json({ error: 'Sem acesso a este workspace' })
    const result = await query(
      `UPDATE meetings SET status = 'in_progress', actual_start = NOW() WHERE id = $1 RETURNING *`,
      [req.params.id]
    )
    return res.json(result.rows[0])
  } catch (err: unknown) {
    return res.status(500).json({ error: 'Erro interno' })
  }
})

// POST /api/meetings/:id/pause
router.post('/:id/pause', async (req: AuthRequest, res: Response) => {
  try {
    const meetingRow = await query('SELECT workspace_id FROM meetings WHERE id = $1', [req.params.id])
    if (meetingRow.rows.length === 0) return res.status(404).json({ error: 'Sessão não encontrada' })
    if (!req.user?.id) return res.status(401).json({ error: 'Não autenticado' })
    const allowed = await canAccessWorkspace(meetingRow.rows[0].workspace_id, req.user.id)
    if (!allowed) return res.status(403).json({ error: 'Sem acesso a este workspace' })
    const result = await query(
      `UPDATE meetings SET status = 'paused' WHERE id = $1 RETURNING *`,
      [req.params.id]
    )
    return res.json(result.rows[0])
  } catch (err: unknown) {
    return res.status(500).json({ error: 'Erro interno' })
  }
})

// POST /api/meetings/:id/resume
router.post('/:id/resume', async (req: AuthRequest, res: Response) => {
  try {
    const meetingRow = await query('SELECT workspace_id FROM meetings WHERE id = $1', [req.params.id])
    if (meetingRow.rows.length === 0) return res.status(404).json({ error: 'Sessão não encontrada' })
    if (!req.user?.id) return res.status(401).json({ error: 'Não autenticado' })
    const allowed = await canAccessWorkspace(meetingRow.rows[0].workspace_id, req.user.id)
    if (!allowed) return res.status(403).json({ error: 'Sem acesso a este workspace' })
    const result = await query(
      `UPDATE meetings SET status = 'in_progress' WHERE id = $1 RETURNING *`,
      [req.params.id]
    )
    return res.json(result.rows[0])
  } catch (err: unknown) {
    return res.status(500).json({ error: 'Erro interno' })
  }
})

// POST /api/meetings/:id/end
router.post('/:id/end', async (req: AuthRequest, res: Response) => {
  try {
    const meetingId = typeof req.params.id === 'string' ? req.params.id : req.params.id[0]
    const meetingRow = await query('SELECT workspace_id FROM meetings WHERE id = $1', [meetingId])
    if (meetingRow.rows.length === 0) return res.status(404).json({ error: 'Sessão não encontrada' })
    if (!req.user?.id) return res.status(401).json({ error: 'Não autenticado' })
    const allowed = await canAccessWorkspace(meetingRow.rows[0].workspace_id, req.user.id)
    if (!allowed) return res.status(403).json({ error: 'Sem acesso a este workspace' })
    const { summary } = req.body
    const result = await query(
      `UPDATE meetings SET status = 'completed', actual_end = NOW(), summary = $2 WHERE id = $1 RETURNING *`,
      [meetingId, summary || null]
    )
    emitToMeeting(meetingId, 'meeting_status', { status: 'completed' })
    return res.json(result.rows[0])
  } catch (err: unknown) {
    return res.status(500).json({ error: 'Erro interno' })
  }
})

// POST /api/meetings/:id/agents
router.post('/:id/agents', async (req: AuthRequest, res: Response) => {
  try {
    const meetingRow = await query('SELECT workspace_id FROM meetings WHERE id = $1', [req.params.id])
    if (meetingRow.rows.length === 0) return res.status(404).json({ error: 'Sessão não encontrada' })
    if (!req.user?.id) return res.status(401).json({ error: 'Não autenticado' })
    const allowed = await canAccessWorkspace(meetingRow.rows[0].workspace_id, req.user.id)
    if (!allowed) return res.status(403).json({ error: 'Sem acesso a este workspace' })
    const { agent_id, role_in_meeting, speaking_order } = req.body
    const result = await query(
      `INSERT INTO meeting_agents (meeting_id, agent_id, role_in_meeting, speaking_order)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.params.id, agent_id, role_in_meeting || 'participant', speaking_order || null]
    )
    return res.status(201).json(result.rows[0])
  } catch (err: unknown) {
    return res.status(500).json({ error: 'Erro interno' })
  }
})

// DELETE /api/meetings/:id/agents/:agentId
router.delete('/:id/agents/:agentId', async (req: AuthRequest, res: Response) => {
  try {
    const meetingRow = await query('SELECT workspace_id FROM meetings WHERE id = $1', [req.params.id])
    if (meetingRow.rows.length === 0) return res.status(404).json({ error: 'Sessão não encontrada' })
    if (!req.user?.id) return res.status(401).json({ error: 'Não autenticado' })
    const allowed = await canAccessWorkspace(meetingRow.rows[0].workspace_id, req.user.id)
    if (!allowed) return res.status(403).json({ error: 'Sem acesso a este workspace' })
    await query(
      'DELETE FROM meeting_agents WHERE meeting_id = $1 AND agent_id = $2',
      [req.params.id, req.params.agentId]
    )
    return res.json({ message: 'Agente removido da sessão' })
  } catch (err: unknown) {
    return res.status(500).json({ error: 'Erro interno' })
  }
})

// GET /api/meetings/:id/transcripts
router.get('/:id/transcripts', async (req: AuthRequest, res: Response) => {
  try {
    const meetingRow = await query('SELECT workspace_id FROM meetings WHERE id = $1', [req.params.id])
    if (meetingRow.rows.length === 0) return res.status(404).json({ error: 'Sessão não encontrada' })
    if (!req.user?.id) return res.status(401).json({ error: 'Não autenticado' })
    const allowed = await canAccessWorkspace(meetingRow.rows[0].workspace_id, req.user.id)
    if (!allowed) return res.status(403).json({ error: 'Sem acesso a este workspace' })
    const result = await query(
      'SELECT * FROM transcripts WHERE meeting_id = $1 ORDER BY sequence_number ASC',
      [req.params.id]
    )
    return res.json(result.rows)
  } catch (err: unknown) {
    return res.status(500).json({ error: 'Erro interno' })
  }
})

// POST /api/meetings/:id/transcripts
router.post('/:id/transcripts', async (req: AuthRequest, res: Response) => {
  try {
    const meetingId = typeof req.params.id === 'string' ? req.params.id : req.params.id[0]
    const meetingRow = await query('SELECT workspace_id FROM meetings WHERE id = $1', [meetingId])
    if (meetingRow.rows.length === 0) return res.status(404).json({ error: 'Sessão não encontrada' })
    if (!req.user?.id) return res.status(401).json({ error: 'Não autenticado' })
    const allowed = await canAccessWorkspace(meetingRow.rows[0].workspace_id, req.user.id)
    if (!allowed) return res.status(403).json({ error: 'Sem acesso a este workspace' })
    const { speaker_type, speaker_id, speaker_name, content, content_type, sentiment_score, topics } = req.body

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ error: 'Conteúdo da mensagem é obrigatório' })
    }
    if (content.length > 5000) {
      return res.status(400).json({ error: 'Mensagem muito longa (máximo 5000 caracteres)' })
    }

    // Pegar o próximo sequence_number
    const seqRes = await query(
      'SELECT COALESCE(MAX(sequence_number), 0) + 1 as next_seq FROM transcripts WHERE meeting_id = $1',
      [meetingId]
    )

    const result = await query(
      `INSERT INTO transcripts (meeting_id, sequence_number, speaker_type, speaker_id, speaker_name, content, content_type, timestamp_start, sentiment_score, topics)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, $9) RETURNING *`,
      [meetingId, seqRes.rows[0].next_seq, speaker_type, speaker_id || null,
       speaker_name, content, content_type || 'speech', sentiment_score || null, topics || []]
    )
    const row = result.rows[0]
    emitToMeeting(meetingId, 'transcript', {
      id: row.id,
      sequence_number: row.sequence_number,
      speaker_name: row.speaker_name,
      speaker_id: row.speaker_id,
      content: row.content,
    })

    return res.status(201).json(row)
  } catch (err: unknown) {
    return res.status(500).json({ error: 'Erro interno' })
  }
})

// POST /api/meetings/:id/run-turn - Executa um turno do debate (LLM)
router.post('/:id/run-turn', runTurnLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const meetingId = typeof req.params.id === 'string' ? req.params.id : req.params.id[0]
    const meeting = await query('SELECT workspace_id FROM meetings WHERE id = $1', [meetingId])
    if (meeting.rows.length === 0) return res.status(404).json({ error: 'Reunião não encontrada' })
    if (!req.user?.id) return res.status(401).json({ error: 'Não autenticado' })
    const allowed = await canAccessWorkspace(meeting.rows[0].workspace_id, req.user.id)
    if (!allowed) return res.status(403).json({ error: 'Sem acesso a este workspace' })
    const workspaceId = meeting.rows[0].workspace_id
    const { runDebateTurn } = await import('../services/orchestrator.js')
    const provider = (req.body.provider as 'openai' | 'anthropic') || 'openai'
    const result = await runDebateTurn(meetingId, workspaceId, provider)
    return res.json(result)
  } catch (err: unknown) {
    console.error('Erro run-turn:', err)
    return res.status(500).json({ error: 'Erro ao executar turno do debate' })
  }
})

// GET /api/meetings/:id/feedback — feedback like/dislike do usuário na reunião (RF-GAME-003)
router.get('/:id/feedback', async (req: AuthRequest, res: Response) => {
  try {
    const meetingId = typeof req.params.id === 'string' ? req.params.id : req.params.id[0]
    const meeting = await query('SELECT workspace_id FROM meetings WHERE id = $1', [meetingId])
    if (meeting.rows.length === 0) return res.status(404).json({ error: 'Reunião não encontrada' })
    if (!req.user?.id) return res.status(401).json({ error: 'Não autenticado' })
    const allowed = await canAccessWorkspace(meeting.rows[0].workspace_id, req.user.id)
    if (!allowed) return res.status(403).json({ error: 'Sem acesso a este workspace' })
    const fb = await query(
      `SELECT tf.transcript_id, tf.rating FROM transcript_feedback tf
       JOIN transcripts t ON t.id = tf.transcript_id AND t.meeting_id = $1
       WHERE tf.user_id = $2`,
      [meetingId, req.user.id]
    )
    const map: Record<string, number> = {}
    for (const row of fb.rows) {
      map[row.transcript_id] = row.rating
    }
    return res.json(map)
  } catch (err: unknown) {
    return res.status(500).json({ error: 'Erro interno' })
  }
})

// POST /api/meetings/:id/transcripts/:transcriptId/feedback — like/dislike (RF-GAME-003)
router.post('/:id/transcripts/:transcriptId/feedback', async (req: AuthRequest, res: Response) => {
  try {
    const meetingId = typeof req.params.id === 'string' ? req.params.id : req.params.id[0]
    const transcriptId = typeof req.params.transcriptId === 'string' ? req.params.transcriptId : req.params.transcriptId?.[0]
    if (!transcriptId || !/^[0-9a-f-]{36}$/i.test(transcriptId)) return res.status(400).json({ error: 'transcriptId inválido' })
    const { rating } = req.body
    if (rating !== 1 && rating !== -1) return res.status(400).json({ error: 'rating deve ser 1 (like) ou -1 (dislike)' })
    const meeting = await query('SELECT workspace_id FROM meetings WHERE id = $1', [meetingId])
    if (meeting.rows.length === 0) return res.status(404).json({ error: 'Reunião não encontrada' })
    if (!req.user?.id) return res.status(401).json({ error: 'Não autenticado' })
    const allowed = await canAccessWorkspace(meeting.rows[0].workspace_id, req.user.id)
    if (!allowed) return res.status(403).json({ error: 'Sem acesso a este workspace' })
    const t = await query('SELECT id FROM transcripts WHERE id = $1 AND meeting_id = $2', [transcriptId, meetingId])
    if (t.rows.length === 0) return res.status(404).json({ error: 'Transcrição não encontrada' })
    await query(
      `INSERT INTO transcript_feedback (transcript_id, user_id, rating)
       VALUES ($1, $2, $3)
       ON CONFLICT (transcript_id, user_id) DO UPDATE SET rating = EXCLUDED.rating`,
      [transcriptId, req.user.id, rating]
    )
    return res.json({ transcript_id: transcriptId, rating })
  } catch (err: unknown) {
    return res.status(500).json({ error: 'Erro interno' })
  }
})

// DELETE /api/meetings/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const meetingRow = await query('SELECT workspace_id FROM meetings WHERE id = $1', [req.params.id])
    if (meetingRow.rows.length === 0) return res.status(404).json({ error: 'Sessão não encontrada' })
    if (!req.user?.id) return res.status(401).json({ error: 'Não autenticado' })
    const allowed = await canAccessWorkspace(meetingRow.rows[0].workspace_id, req.user.id)
    if (!allowed) return res.status(403).json({ error: 'Sem acesso a este workspace' })
    await query('DELETE FROM meetings WHERE id = $1', [req.params.id])
    return res.json({ message: 'Sessão removida' })
  } catch (err: unknown) {
    return res.status(500).json({ error: 'Erro interno' })
  }
})

export default router
