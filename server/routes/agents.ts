import { Router, Response } from 'express'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'
import { query } from '../db.js'
import { authMiddleware, AuthRequest, canAccessWorkspace } from '../middleware/auth.js'
import { validateUuidParam } from '../middleware/validateUuid.js'
import { validateRequest } from '../middleware/validateRequest.js'

const createAgentSchema = z.object({
  body: z.object({
    workspace_id: z.string().uuid('workspace_id inválido'),
    name: z.string().min(1, 'Nome é obrigatório').max(100),
    role: z.string().min(1, 'Role é obrigatório').max(100),
    system_prompt: z.string().min(10, 'System prompt deve ter pelo menos 10 caracteres').max(5000),
    description: z.string().optional(),
    avatar_url: z.string().url().optional().or(z.literal('')),
    tags: z.array(z.string()).optional(),
    expertise: z.array(z.string()).optional(),
    personality_traits: z.record(z.unknown()).optional(),
    behavior_settings: z.record(z.unknown()).optional(),
    model_settings: z.record(z.unknown()).optional(),
    voice_settings: z.record(z.unknown()).optional(),
    visual_avatar: z.record(z.unknown()).optional(),
    is_template: z.boolean().optional(),
    is_public: z.boolean().optional(),
  }),
})

const createAgentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  keyGenerator: (req) => (req as AuthRequest).user?.id ?? (req as { ip?: string }).ip ?? 'anon',
  message: { error: 'Muitas criações de agentes. Aguarde 1 minuto.' },
})

const router = Router()
router.use(authMiddleware)
router.param('id', validateUuidParam)

// GET /api/agents?workspace_id=xxx
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { workspace_id, search, tag, is_template } = req.query

    if (!workspace_id) return res.status(400).json({ error: 'workspace_id obrigatório' })
    if (!req.user?.id) return res.status(401).json({ error: 'Não autenticado' })
    const allowed = await canAccessWorkspace(workspace_id as string, req.user.id)
    if (!allowed) return res.status(403).json({ error: 'Sem acesso a este workspace' })

    let sql = `SELECT * FROM ai_agents WHERE workspace_id = $1 AND is_active = true`
    const params: unknown[] = [workspace_id]
    let idx = 2

    if (search) {
      sql += ` AND (name ILIKE $${idx} OR role ILIKE $${idx} OR description ILIKE $${idx})`
      params.push(`%${search}%`)
      idx++
    }

    if (tag) {
      sql += ` AND $${idx} = ANY(tags)`
      params.push(tag)
      idx++
    }

    if (is_template === 'true') {
      sql += ` AND is_template = true`
    }

    sql += ` ORDER BY created_at DESC`

    const result = await query(sql, params)
    return res.json(result.rows)
  } catch (err: unknown) {
    console.error('Erro ao listar agentes:', err instanceof Error ? err.message : err)
    return res.status(500).json({ error: 'Erro interno' })
  }
})

// GET /api/agents/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const result = await query('SELECT * FROM ai_agents WHERE id = $1', [req.params.id])
    if (result.rows.length === 0) return res.status(404).json({ error: 'Agente não encontrado' })
    const agent = result.rows[0]
    if (!req.user?.id) return res.status(401).json({ error: 'Não autenticado' })
    const allowed = await canAccessWorkspace(agent.workspace_id, req.user.id)
    if (!allowed) return res.status(403).json({ error: 'Sem acesso a este workspace' })
    return res.json(agent)
  } catch (err: unknown) {
    return res.status(500).json({ error: 'Erro interno' })
  }
})

// POST /api/agents
router.post('/', createAgentLimiter, validateRequest(createAgentSchema), async (req: AuthRequest, res: Response) => {
  try {
    const {
      workspace_id, name, description, role, expertise, system_prompt,
      personality_traits, voice_settings, visual_avatar, behavior_settings,
      model_settings, tags, is_template, is_public
    } = req.body

    if (!workspace_id || !name || !role) {
      return res.status(400).json({ error: 'workspace_id, name e role são obrigatórios' })
    }
    if (!req.user?.id) return res.status(401).json({ error: 'Não autenticado' })
    const allowed = await canAccessWorkspace(workspace_id, req.user.id)
    if (!allowed) return res.status(403).json({ error: 'Sem acesso a este workspace' })

    const result = await query(
      `INSERT INTO ai_agents (
        workspace_id, created_by, name, description, role, expertise, system_prompt,
        personality_traits, voice_settings, visual_avatar, behavior_settings,
        model_settings, tags, is_template, is_public
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        workspace_id, req.user!.id, name, description || null, role,
        expertise || [], system_prompt || '',
        JSON.stringify(personality_traits || { professionalism: 8, creativity: 6, detail_orientation: 7, assertiveness: 5, empathy: 6, humor: 3 }),
        JSON.stringify(voice_settings || {}),
        JSON.stringify(visual_avatar || {}),
        JSON.stringify(behavior_settings || {}),
        JSON.stringify(model_settings || { model: 'gpt-4', temperature: 0.7, max_tokens: 4000 }),
        tags || [], is_template || false, is_public || false,
      ]
    )

    return res.status(201).json(result.rows[0])
  } catch (err: unknown) {
    console.error('Erro ao criar agente:', err instanceof Error ? err.message : err)
    return res.status(500).json({ error: 'Erro interno' })
  }
})

// PUT /api/agents/:id
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const existing = await query('SELECT workspace_id FROM ai_agents WHERE id = $1', [req.params.id])
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Agente não encontrado' })
    if (!req.user?.id) return res.status(401).json({ error: 'Não autenticado' })
    const allowed = await canAccessWorkspace(existing.rows[0].workspace_id, req.user.id)
    if (!allowed) return res.status(403).json({ error: 'Sem acesso a este workspace' })

    const fields = ['name', 'description', 'role', 'expertise', 'system_prompt',
      'personality_traits', 'voice_settings', 'visual_avatar', 'behavior_settings',
      'model_settings', 'tags', 'is_template', 'is_public', 'is_active']

    const updates: string[] = []
    const params: unknown[] = []
    let idx = 1

    for (const field of fields) {
      if (req.body[field] !== undefined) {
        const val = typeof req.body[field] === 'object' && !Array.isArray(req.body[field])
          ? JSON.stringify(req.body[field]) : req.body[field]
        updates.push(`${field} = $${idx}`)
        params.push(val)
        idx++
      }
    }

    if (updates.length === 0) return res.status(400).json({ error: 'Nada para atualizar' })

    params.push(req.params.id)
    const result = await query(
      `UPDATE ai_agents SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    )

    if (result.rows.length === 0) return res.status(404).json({ error: 'Agente não encontrado' })
    return res.json(result.rows[0])
  } catch (err: unknown) {
    return res.status(500).json({ error: 'Erro interno' })
  }
})

// DELETE /api/agents/:id (soft delete)
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const existing = await query('SELECT workspace_id FROM ai_agents WHERE id = $1', [req.params.id])
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Agente não encontrado' })
    if (!req.user?.id) return res.status(401).json({ error: 'Não autenticado' })
    const allowed = await canAccessWorkspace(existing.rows[0].workspace_id, req.user.id)
    if (!allowed) return res.status(403).json({ error: 'Sem acesso a este workspace' })
    await query('UPDATE ai_agents SET is_active = false WHERE id = $1', [req.params.id])
    return res.json({ message: 'Agente removido' })
  } catch (err: unknown) {
    return res.status(500).json({ error: 'Erro interno' })
  }
})

// POST /api/agents/:id/duplicate
router.post('/:id/duplicate', async (req: AuthRequest, res: Response) => {
  try {
    const original = await query('SELECT * FROM ai_agents WHERE id = $1', [req.params.id])
    if (original.rows.length === 0) return res.status(404).json({ error: 'Agente não encontrado' })
    const a = original.rows[0]
    if (!req.user?.id) return res.status(401).json({ error: 'Não autenticado' })
    const allowed = await canAccessWorkspace(a.workspace_id, req.user.id)
    if (!allowed) return res.status(403).json({ error: 'Sem acesso a este workspace' })
    const result = await query(
      `INSERT INTO ai_agents (workspace_id, created_by, name, description, role, expertise, system_prompt,
        personality_traits, voice_settings, visual_avatar, behavior_settings, model_settings, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [a.workspace_id, req.user!.id, `${a.name} (Cópia)`, a.description, a.role, a.expertise,
       a.system_prompt, JSON.stringify(a.personality_traits), JSON.stringify(a.voice_settings),
       JSON.stringify(a.visual_avatar), JSON.stringify(a.behavior_settings),
       JSON.stringify(a.model_settings), a.tags]
    )

    return res.status(201).json(result.rows[0])
  } catch (err: unknown) {
    return res.status(500).json({ error: 'Erro interno' })
  }
})

// GET /api/agents/:id/knowledge
router.get('/:id/knowledge', async (req: AuthRequest, res: Response) => {
  try {
    const agentRow = await query('SELECT workspace_id FROM ai_agents WHERE id = $1', [req.params.id])
    if (agentRow.rows.length === 0) return res.status(404).json({ error: 'Agente não encontrado' })
    if (!req.user?.id) return res.status(401).json({ error: 'Não autenticado' })
    const allowed = await canAccessWorkspace(agentRow.rows[0].workspace_id, req.user.id)
    if (!allowed) return res.status(403).json({ error: 'Sem acesso a este workspace' })
    const result = await query(
      'SELECT * FROM agent_knowledge WHERE agent_id = $1 AND is_active = true ORDER BY created_at DESC',
      [req.params.id]
    )
    return res.json(result.rows)
  } catch (err: unknown) {
    return res.status(500).json({ error: 'Erro interno' })
  }
})

// POST /api/agents/:id/knowledge
router.post('/:id/knowledge', async (req: AuthRequest, res: Response) => {
  try {
    const agentRow = await query('SELECT workspace_id FROM ai_agents WHERE id = $1', [req.params.id])
    if (agentRow.rows.length === 0) return res.status(404).json({ error: 'Agente não encontrado' })
    if (!req.user?.id) return res.status(401).json({ error: 'Não autenticado' })
    const allowed = await canAccessWorkspace(agentRow.rows[0].workspace_id, req.user.id)
    if (!allowed) return res.status(403).json({ error: 'Sem acesso a este workspace' })
    const { title, content, category, tags, source_type } = req.body
    const result = await query(
      `INSERT INTO agent_knowledge (agent_id, title, content, category, tags, source_type)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.params.id, title, content, category || null, tags || [], source_type || 'manual']
    )
    return res.status(201).json(result.rows[0])
  } catch (err: unknown) {
    return res.status(500).json({ error: 'Erro interno' })
  }
})

export default router
