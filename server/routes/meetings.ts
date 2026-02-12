import { Router, Response } from 'express'
import { query } from '../db.js'
import { authMiddleware, AuthRequest } from '../middleware/auth.js'

const router = Router()
router.use(authMiddleware)

// GET /api/meetings?workspace_id=xxx
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { workspace_id, status, meeting_type } = req.query
    if (!workspace_id) return res.status(400).json({ error: 'workspace_id obrigatório' })

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

    sql += ` ORDER BY m.created_at DESC`

    const result = await query(sql, params)
    return res.json(result.rows)
  } catch (err: any) {
    console.error('Erro ao listar sessões:', err)
    return res.status(500).json({ error: 'Erro interno' })
  }
})

// GET /api/meetings/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const meetingRes = await query('SELECT * FROM meetings WHERE id = $1', [req.params.id])
    if (meetingRes.rows.length === 0) return res.status(404).json({ error: 'Sessão não encontrada' })

    const meeting = meetingRes.rows[0]

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
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro interno' })
  }
})

// POST /api/meetings
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const {
      workspace_id, title, description, topic, objectives, meeting_type,
      scheduled_start, scheduled_end, agenda, parameters, settings, tags, agent_ids
    } = req.body

    if (!workspace_id || !title) {
      return res.status(400).json({ error: 'workspace_id e title são obrigatórios' })
    }

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
  } catch (err: any) {
    console.error('Erro ao criar sessão:', err)
    return res.status(500).json({ error: 'Erro interno' })
  }
})

// PUT /api/meetings/:id
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
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
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro interno' })
  }
})

// POST /api/meetings/:id/start
router.post('/:id/start', async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `UPDATE meetings SET status = 'in_progress', actual_start = NOW() WHERE id = $1 RETURNING *`,
      [req.params.id]
    )
    return res.json(result.rows[0])
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro interno' })
  }
})

// POST /api/meetings/:id/pause
router.post('/:id/pause', async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `UPDATE meetings SET status = 'paused' WHERE id = $1 RETURNING *`,
      [req.params.id]
    )
    return res.json(result.rows[0])
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro interno' })
  }
})

// POST /api/meetings/:id/resume
router.post('/:id/resume', async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `UPDATE meetings SET status = 'in_progress' WHERE id = $1 RETURNING *`,
      [req.params.id]
    )
    return res.json(result.rows[0])
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro interno' })
  }
})

// POST /api/meetings/:id/end
router.post('/:id/end', async (req: AuthRequest, res: Response) => {
  try {
    const { summary } = req.body
    const result = await query(
      `UPDATE meetings SET status = 'completed', actual_end = NOW(), summary = $2 WHERE id = $1 RETURNING *`,
      [req.params.id, summary || null]
    )
    return res.json(result.rows[0])
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro interno' })
  }
})

// POST /api/meetings/:id/agents
router.post('/:id/agents', async (req: AuthRequest, res: Response) => {
  try {
    const { agent_id, role_in_meeting, speaking_order } = req.body
    const result = await query(
      `INSERT INTO meeting_agents (meeting_id, agent_id, role_in_meeting, speaking_order)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.params.id, agent_id, role_in_meeting || 'participant', speaking_order || null]
    )
    return res.status(201).json(result.rows[0])
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro interno' })
  }
})

// DELETE /api/meetings/:id/agents/:agentId
router.delete('/:id/agents/:agentId', async (req: AuthRequest, res: Response) => {
  try {
    await query(
      'DELETE FROM meeting_agents WHERE meeting_id = $1 AND agent_id = $2',
      [req.params.id, req.params.agentId]
    )
    return res.json({ message: 'Agente removido da sessão' })
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro interno' })
  }
})

// GET /api/meetings/:id/transcripts
router.get('/:id/transcripts', async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      'SELECT * FROM transcripts WHERE meeting_id = $1 ORDER BY sequence_number ASC',
      [req.params.id]
    )
    return res.json(result.rows)
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro interno' })
  }
})

// POST /api/meetings/:id/transcripts
router.post('/:id/transcripts', async (req: AuthRequest, res: Response) => {
  try {
    const { speaker_type, speaker_id, speaker_name, content, content_type, sentiment_score, topics } = req.body

    // Pegar o próximo sequence_number
    const seqRes = await query(
      'SELECT COALESCE(MAX(sequence_number), 0) + 1 as next_seq FROM transcripts WHERE meeting_id = $1',
      [req.params.id]
    )

    const result = await query(
      `INSERT INTO transcripts (meeting_id, sequence_number, speaker_type, speaker_id, speaker_name, content, content_type, timestamp_start, sentiment_score, topics)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, $9) RETURNING *`,
      [req.params.id, seqRes.rows[0].next_seq, speaker_type, speaker_id || null,
       speaker_name, content, content_type || 'speech', sentiment_score || null, topics || []]
    )

    return res.status(201).json(result.rows[0])
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro interno' })
  }
})

// POST /api/meetings/:id/run-turn - Executa um turno do debate (LLM)
router.post('/:id/run-turn', async (req: AuthRequest, res: Response) => {
  try {
    const meetingId = typeof req.params.id === 'string' ? req.params.id : req.params.id[0]
    const { runDebateTurn } = await import('../services/orchestrator.js')
    const meeting = await query('SELECT workspace_id FROM meetings WHERE id = $1', [meetingId])
    if (meeting.rows.length === 0) return res.status(404).json({ error: 'Reunião não encontrada' })
    const workspaceId = meeting.rows[0].workspace_id
    const provider = (req.body.provider as 'openai' | 'anthropic') || 'openai'
    const result = await runDebateTurn(meetingId, workspaceId, provider)
    return res.json(result)
  } catch (err: any) {
    console.error('Erro run-turn:', err)
    return res.status(500).json({ error: err.message })
  }
})

// DELETE /api/meetings/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    await query('DELETE FROM meetings WHERE id = $1', [req.params.id])
    return res.json({ message: 'Sessão removida' })
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro interno' })
  }
})

export default router
