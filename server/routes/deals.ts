import { Router, Response } from 'express'
import { query } from '../db.js'
import { authMiddleware, AuthRequest, canAccessWorkspace } from '../middleware/auth.js'
import { validateUuidParam } from '../middleware/validateUuid.js'

const router = Router()
router.use(authMiddleware)
router.param('id', validateUuidParam)

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = req.query.workspace_id as string
    if (!workspaceId) return res.status(400).json({ error: 'workspace_id obrigatório' })
    if (!req.user?.id) return res.status(401).json({ error: 'Não autenticado' })
    const allowed = await canAccessWorkspace(workspaceId, req.user.id)
    if (!allowed) return res.status(403).json({ error: 'Sem acesso a este workspace' })
    const result = await query(
      'SELECT * FROM deals WHERE workspace_id = $1 ORDER BY created_at DESC',
      [workspaceId]
    )
    return res.json(result.rows)
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro interno' })
  }
})

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { workspace_id, title, description, value, currency, status } = req.body
    if (!workspace_id || !title) return res.status(400).json({ error: 'workspace_id e title obrigatórios' })
    if (!req.user?.id) return res.status(401).json({ error: 'Não autenticado' })
    const allowed = await canAccessWorkspace(workspace_id, req.user.id)
    if (!allowed) return res.status(403).json({ error: 'Sem acesso a este workspace' })
    const result = await query(
      `INSERT INTO deals (workspace_id, created_by, title, description, value, currency, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [workspace_id, req.user.id, title, description || null, value ?? null, currency || 'BRL', status || 'prospecting']
    )
    return res.status(201).json(result.rows[0])
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro interno' })
  }
})

router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const row = await query('SELECT workspace_id FROM deals WHERE id = $1', [req.params.id])
    if (row.rows.length === 0) return res.status(404).json({ error: 'Negócio não encontrado' })
    if (!req.user?.id) return res.status(401).json({ error: 'Não autenticado' })
    const allowed = await canAccessWorkspace(row.rows[0].workspace_id, req.user.id)
    if (!allowed) return res.status(403).json({ error: 'Sem acesso' })
    const fields = ['title', 'description', 'value', 'currency', 'status', 'probability', 'expected_close_date']
    const updates: string[] = []
    const params: unknown[] = []
    let idx = 1
    for (const f of fields) {
      if (req.body[f] !== undefined) { updates.push(`${f} = $${idx}`); params.push(req.body[f]); idx++ }
    }
    if (updates.length === 0) return res.status(400).json({ error: 'Nada para atualizar' })
    params.push(req.params.id)
    const result = await query(`UPDATE deals SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING *`, params)
    return res.json(result.rows[0])
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro interno' })
  }
})

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const row = await query('SELECT workspace_id FROM deals WHERE id = $1', [req.params.id])
    if (row.rows.length === 0) return res.status(404).json({ error: 'Negócio não encontrado' })
    if (!req.user?.id) return res.status(401).json({ error: 'Não autenticado' })
    const allowed = await canAccessWorkspace(row.rows[0].workspace_id, req.user.id)
    if (!allowed) return res.status(403).json({ error: 'Sem acesso' })
    await query('DELETE FROM deals WHERE id = $1', [req.params.id])
    return res.json({ message: 'Negócio removido' })
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro interno' })
  }
})

export default router
