import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import rateLimit from 'express-rate-limit'
import { query } from '../db.js'
import { generateToken, authMiddleware, AuthRequest } from '../middleware/auth.js'

const router = Router()

// Rate limiting para login e registro
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 15, // máximo 15 tentativas por IP
  message: { error: 'Muitas tentativas. Aguarde 15 minutos antes de tentar novamente.' },
  standardHeaders: true,
  legacyHeaders: false,
})
router.use('/login', authLimiter)
router.use('/register', authLimiter)

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name, company, job_title } = req.body

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, senha e nome são obrigatórios' })
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres' })
    }

    // Verificar se email já existe
    const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()])
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email já cadastrado' })
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const result = await query(
      `INSERT INTO users (email, encrypted_password, name, company, job_title, email_verified_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING id, email, name, is_super_admin, avatar_url, company, job_title, timezone, locale, created_at`,
      [email.toLowerCase(), hashedPassword, name, company || null, job_title || null]
    )

    const user = result.rows[0]

    // Criar workspace padrão para o usuário
    const wsResult = await query(
      `INSERT INTO workspaces (name, slug, owner_id, description)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [`Workspace de ${name}`, `ws-${user.id.substring(0, 8)}`, user.id, 'Workspace padrão']
    )

    // Adicionar como admin do workspace
    await query(
      `INSERT INTO workspace_members (workspace_id, user_id, role, permissions)
       VALUES ($1, $2, 'workspace_admin', '{"can_create_sessions": true, "can_create_agents": true, "can_manage_users": true, "can_view_analytics": true, "can_export_data": true, "can_manage_billing": true, "can_manage_integrations": true}')`,
      [wsResult.rows[0].id, user.id]
    )

    // Seed dos 15 agentes template no novo workspace
    const { seedAgentsForWorkspace } = await import('../services/seed-agents.js')
    await seedAgentsForWorkspace(wsResult.rows[0].id, user.id)

    // Buscar workspace completo para resposta
    const wsData = await query(
      `SELECT w.id, w.name, w.slug, w.logo_url, w.plan, wm.role
       FROM workspaces w
       JOIN workspace_members wm ON wm.workspace_id = w.id
       WHERE w.id = $1 AND wm.user_id = $2`,
      [wsResult.rows[0].id, user.id]
    )

    const token = generateToken({
      id: user.id,
      email: user.email,
      name: user.name,
      is_super_admin: user.is_super_admin,
    })

    return res.status(201).json({
      user,
      workspaces: wsData.rows,
      token,
    })
  } catch (err: any) {
    console.error('Erro no registro:', err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' })
    }

    const result = await query(
      `SELECT id, email, name, encrypted_password, is_super_admin, avatar_url, company,
              job_title, timezone, locale, two_factor_enabled, is_active
       FROM users WHERE email = $1`,
      [email.toLowerCase()]
    )

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciais inválidas' })
    }

    const user = result.rows[0]

    if (!user.is_active) {
      return res.status(403).json({ error: 'Conta desativada' })
    }

    const validPassword = await bcrypt.compare(password, user.encrypted_password)
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciais inválidas' })
    }

    // Atualizar último login
    await query(
      'UPDATE users SET last_login_at = NOW(), login_count = login_count + 1, last_active_at = NOW() WHERE id = $1',
      [user.id]
    )

    // Buscar workspaces do usuário
    const workspaces = await query(
      `SELECT w.id, w.name, w.slug, w.logo_url, w.plan, wm.role
       FROM workspaces w
       JOIN workspace_members wm ON wm.workspace_id = w.id
       WHERE wm.user_id = $1 AND wm.is_active = true AND w.is_active = true
       ORDER BY wm.joined_at ASC`,
      [user.id]
    )

    // Garantir que cada workspace tenha agentes (fix para users criados antes do seed)
    for (const ws of workspaces.rows) {
      try {
        const agentCount = await query(
          'SELECT COUNT(*)::int as cnt FROM ai_agents WHERE workspace_id = $1 AND is_active = true',
          [ws.id]
        )
        if (agentCount.rows[0].cnt === 0) {
          const { seedAgentsForWorkspace } = await import('../services/seed-agents.js')
          await seedAgentsForWorkspace(ws.id, user.id)
          console.log(`Seed: agentes inseridos no workspace ${ws.id} (login fix)`)
        }
      } catch (seedErr) {
        console.error(`Erro ao seed de agentes no workspace ${ws.id}:`, seedErr)
      }
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      name: user.name,
      is_super_admin: user.is_super_admin,
    })

    const { encrypted_password: _, ...safeUser } = user

    return res.json({
      user: safeUser,
      workspaces: workspaces.rows,
      token,
    })
  } catch (err: any) {
    console.error('Erro no login:', err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// GET /api/auth/me
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT id, email, name, is_super_admin, avatar_url, company, job_title,
              timezone, locale, two_factor_enabled, created_at
       FROM users WHERE id = $1`,
      [req.user!.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' })
    }

    const workspaces = await query(
      `SELECT w.id, w.name, w.slug, w.logo_url, w.plan, wm.role
       FROM workspaces w
       JOIN workspace_members wm ON wm.workspace_id = w.id
       WHERE wm.user_id = $1 AND wm.is_active = true AND w.is_active = true`,
      [req.user!.id]
    )

    // Garantir agentes em cada workspace (fix retroativo)
    for (const ws of workspaces.rows) {
      try {
        const agentCount = await query(
          'SELECT COUNT(*)::int as cnt FROM ai_agents WHERE workspace_id = $1 AND is_active = true',
          [ws.id]
        )
        if (agentCount.rows[0].cnt === 0) {
          const { seedAgentsForWorkspace } = await import('../services/seed-agents.js')
          await seedAgentsForWorkspace(ws.id, req.user!.id)
        }
      } catch (_) { /* silencioso */ }
    }

    return res.json({
      user: result.rows[0],
      workspaces: workspaces.rows,
    })
  } catch (err: any) {
    console.error('Erro ao buscar perfil:', err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// PUT /api/auth/profile — atualiza nome, company, job_title, avatar_url (RF-CLEAN-003)
router.put('/profile', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { name, company, job_title, avatar_url } = req.body
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Nome é obrigatório' })
    }
    const trimmedName = name.trim().slice(0, 150)
    const trimmedCompany = company != null ? String(company).trim().slice(0, 200) : null
    const trimmedJobTitle = job_title != null ? String(job_title).trim().slice(0, 150) : null
    const trimmedAvatar = avatar_url != null ? String(avatar_url).trim().slice(0, 2000) : null

    await query(
      `UPDATE users SET name = $1, company = $2, job_title = $3, avatar_url = $4, updated_at = NOW() WHERE id = $5`,
      [trimmedName, trimmedCompany, trimmedJobTitle, trimmedAvatar || null, req.user!.id]
    )
    const result = await query(
      'SELECT id, email, name, company, job_title, avatar_url, timezone, locale FROM users WHERE id = $1',
      [req.user!.id]
    )
    return res.json(result.rows[0])
  } catch (err: any) {
    console.error('Erro ao atualizar perfil:', err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// PUT /api/auth/password
router.put('/password', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { current_password, new_password } = req.body

    if (!current_password) {
      return res.status(400).json({ error: 'Senha atual é obrigatória' })
    }
    if (!new_password || new_password.length < 6) {
      return res.status(400).json({ error: 'Nova senha deve ter pelo menos 6 caracteres' })
    }

    const result = await query('SELECT encrypted_password FROM users WHERE id = $1', [req.user!.id])
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' })
    }
    const valid = await bcrypt.compare(current_password, result.rows[0].encrypted_password)
    if (!valid) {
      return res.status(401).json({ error: 'Senha atual incorreta' })
    }

    const hashed = await bcrypt.hash(new_password, 12)
    await query('UPDATE users SET encrypted_password = $1 WHERE id = $2', [hashed, req.user!.id])

    return res.json({ message: 'Senha atualizada com sucesso' })
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

export default router
