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
      'SELECT * FROM contacts WHERE workspace_id = $1 ORDER BY name',
      [workspaceId]
    )
    return res.json(result.rows)
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro interno' })
  }
})

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { workspace_id, name, email, company, job_title, phone, notes } = req.body
    if (!workspace_id || !name) return res.status(400).json({ error: 'workspace_id e name obrigatórios' })
    if (!req.user?.id) return res.status(401).json({ error: 'Não autenticado' })
    const allowed = await canAccessWorkspace(workspace_id, req.user.id)
    if (!allowed) return res.status(403).json({ error: 'Sem acesso a este workspace' })
    const result = await query(
      `INSERT INTO contacts (workspace_id, created_by, name, email, company, job_title, phone, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [workspace_id, req.user.id, name, email || null, company || null, job_title || null, phone || null, notes || null]
    )
    return res.status(201).json(result.rows[0])
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro interno' })
  }
})

router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const row = await query('SELECT workspace_id FROM contacts WHERE id = $1', [req.params.id])
    if (row.rows.length === 0) return res.status(404).json({ error: 'Contato não encontrado' })
    if (!req.user?.id) return res.status(401).json({ error: 'Não autenticado' })
    const allowed = await canAccessWorkspace(row.rows[0].workspace_id, req.user.id)
    if (!allowed) return res.status(403).json({ error: 'Sem acesso' })
    const { name, email, company, job_title, phone, notes } = req.body
    const updates: string[] = []
    const params: unknown[] = []
    let idx = 1
    if (name !== undefined) { updates.push(`name = $${idx}`); params.push(name); idx++ }
    if (email !== undefined) { updates.push(`email = $${idx}`); params.push(email); idx++ }
    if (company !== undefined) { updates.push(`company = $${idx}`); params.push(company); idx++ }
    if (job_title !== undefined) { updates.push(`job_title = $${idx}`); params.push(job_title); idx++ }
    if (phone !== undefined) { updates.push(`phone = $${idx}`); params.push(phone); idx++ }
    if (notes !== undefined) { updates.push(`notes = $${idx}`); params.push(notes); idx++ }
    if (updates.length === 0) return res.status(400).json({ error: 'Nada para atualizar' })
    params.push(req.params.id)
    const result = await query(`UPDATE contacts SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING *`, params)
    return res.json(result.rows[0])
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro interno' })
  }
})

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const row = await query('SELECT workspace_id FROM contacts WHERE id = $1', [req.params.id])
    if (row.rows.length === 0) return res.status(404).json({ error: 'Contato não encontrado' })
    if (!req.user?.id) return res.status(401).json({ error: 'Não autenticado' })
    const allowed = await canAccessWorkspace(row.rows[0].workspace_id, req.user.id)
    if (!allowed) return res.status(403).json({ error: 'Sem acesso' })
    await query('DELETE FROM contacts WHERE id = $1', [req.params.id])
    return res.json({ message: 'Contato removido' })
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro interno' })
  }
})

export default router
