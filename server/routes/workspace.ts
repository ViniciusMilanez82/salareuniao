import { Router, Response } from 'express'
import { query } from '../db.js'
import { authMiddleware, AuthRequest } from '../middleware/auth.js'

const router = Router()
router.use(authMiddleware)

// GET /api/workspaces
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT w.*, wm.role as my_role
       FROM workspaces w
       JOIN workspace_members wm ON wm.workspace_id = w.id
       WHERE wm.user_id = $1 AND wm.is_active = true AND w.is_active = true
       ORDER BY wm.joined_at ASC`,
      [req.user!.id]
    )
    return res.json(result.rows)
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro interno' })
  }
})

// GET /api/workspaces/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT w.*,
        (SELECT COUNT(*) FROM workspace_members wm WHERE wm.workspace_id = w.id AND wm.is_active = true)::int as member_count,
        (SELECT COUNT(*) FROM ai_agents a WHERE a.workspace_id = w.id AND a.is_active = true)::int as agent_count,
        (SELECT COUNT(*) FROM meetings m WHERE m.workspace_id = w.id)::int as meeting_count
       FROM workspaces w WHERE w.id = $1`,
      [req.params.id]
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Workspace não encontrado' })
    return res.json(result.rows[0])
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro interno' })
  }
})

// GET /api/workspaces/:id/members
router.get('/:id/members', async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT wm.*, u.email, u.name, u.avatar_url, u.last_active_at, u.is_active as user_active
       FROM workspace_members wm
       JOIN users u ON u.id = wm.user_id
       WHERE wm.workspace_id = $1
       ORDER BY wm.role, u.name`,
      [req.params.id]
    )
    return res.json(result.rows)
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro interno' })
  }
})

// POST /api/workspaces/:id/invite
router.post('/:id/invite', async (req: AuthRequest, res: Response) => {
  try {
    const { email, role, message } = req.body
    const token = require('crypto').randomBytes(32).toString('hex')

    const result = await query(
      `INSERT INTO invitations (workspace_id, invited_by, email, role, token, message)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.params.id, req.user!.id, email, role || 'observer', token, message || null]
    )

    return res.status(201).json(result.rows[0])
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro interno' })
  }
})

// GET /api/workspaces/:id/dashboard
router.get('/:id/dashboard', async (req: AuthRequest, res: Response) => {
  try {
    const wsId = req.params.id

    const [statsRes, recentSessionsRes, topAgentsRes, recentActivityRes] = await Promise.all([
      query(`
        SELECT
          (SELECT COUNT(*) FROM meetings WHERE workspace_id = $1 AND status = 'in_progress')::int as active_sessions,
          (SELECT COUNT(*) FROM ai_agents WHERE workspace_id = $1 AND is_active = true)::int as total_agents,
          (SELECT COUNT(*) FROM meetings WHERE workspace_id = $1 AND status = 'completed')::int as completed_sessions,
          (SELECT COALESCE(AVG(duration_minutes), 0)::int FROM meetings WHERE workspace_id = $1 AND duration_minutes IS NOT NULL) as avg_duration,
          (SELECT COUNT(*) FROM workspace_members WHERE workspace_id = $1 AND is_active = true)::int as total_members
      `, [wsId]),
      query(`
        SELECT m.*, u.name as creator_name,
          (SELECT COUNT(*) FROM meeting_agents WHERE meeting_id = m.id)::int as agent_count
        FROM meetings m LEFT JOIN users u ON u.id = m.created_by
        WHERE m.workspace_id = $1
        ORDER BY m.created_at DESC LIMIT 10
      `, [wsId]),
      query(`
        SELECT a.id, a.name, a.role, a.avatar_url, a.usage_count, a.average_rating
        FROM ai_agents a
        WHERE a.workspace_id = $1 AND a.is_active = true
        ORDER BY a.usage_count DESC LIMIT 5
      `, [wsId]),
      query(`
        SELECT al.action, al.entity_type, al.entity_name, al.user_name, al.created_at
        FROM audit_logs al
        WHERE al.workspace_id = $1
        ORDER BY al.created_at DESC LIMIT 10
      `, [wsId]),
    ])

    return res.json({
      stats: statsRes.rows[0],
      recent_sessions: recentSessionsRes.rows,
      top_agents: topAgentsRes.rows,
      recent_activity: recentActivityRes.rows,
    })
  } catch (err: any) {
    console.error('Erro no dashboard:', err)
    return res.status(500).json({ error: 'Erro interno' })
  }
})

export default router
