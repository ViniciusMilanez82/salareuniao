import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { query } from '../db.js'

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET não definido. Defina no .env.')
}
const SECRET = JWT_SECRET

export interface AuthUser {
  id: string
  email: string
  name: string
  is_super_admin: boolean
}

export interface AuthRequest extends Request {
  user?: AuthUser
}

export function generateToken(user: AuthUser): string {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, is_super_admin: user.is_super_admin },
    SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as jwt.SignOptions
  )
}

export function verifyToken(token: string): AuthUser {
  return jwt.verify(token, SECRET) as AuthUser
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token não fornecido' })
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)

    // Verificar se o usuário existe e está ativo
    const result = await query(
      'SELECT id, email, name, is_super_admin FROM users WHERE id = $1 AND is_active = true',
      [decoded.id]
    )

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Usuário não encontrado ou inativo' })
    }

    req.user = result.rows[0]

    // Atualizar last_active_at (fire-and-forget)
    query('UPDATE users SET last_active_at = NOW() WHERE id = $1', [decoded.id]).catch(() => {})

    next()
  } catch (err: unknown) {
    const name = err instanceof Error ? (err as { name?: string }).name : ''
    if (name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado. Faça login novamente.' })
    }
    return res.status(401).json({ error: 'Token inválido' })
  }
}

/** Retorna true se o usuário tem acesso ao workspace (membro ativo ou super_admin). */
export async function canAccessWorkspace(workspaceId: string, userId: string): Promise<boolean> {
  // Query unificada (1 query em vez de 2)
  const result = await query(
    `SELECT 1 FROM users u
     WHERE u.id = $2 AND u.is_active = true AND (
       u.is_super_admin = true
       OR EXISTS (
         SELECT 1 FROM workspace_members wm
         WHERE wm.workspace_id = $1 AND wm.user_id = $2 AND wm.is_active = true
       )
     )`,
    [workspaceId, userId]
  )
  return result.rows.length > 0
}

/** Retorna o role do usuário no workspace (ou null se sem acesso). */
export async function getUserWorkspaceRole(workspaceId: string, userId: string): Promise<string | null> {
  const superAdmin = await query(
    'SELECT 1 FROM users WHERE id = $1 AND is_super_admin = true',
    [userId]
  )
  if (superAdmin.rows.length > 0) return 'workspace_admin'

  const result = await query(
    'SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2 AND is_active = true',
    [workspaceId, userId]
  )
  return result.rows[0]?.role || null
}

// Middleware para verificar role no workspace
export function requireRole(...roles: string[]) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const workspaceId = req.params.workspaceId || req.body?.workspace_id || req.query?.workspace_id

      if (!workspaceId) {
        return res.status(400).json({ error: 'workspace_id é obrigatório' })
      }

      // Super admin tem acesso total
      if (req.user?.is_super_admin) return next()

      const result = await query(
        'SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2 AND is_active = true',
        [workspaceId, req.user?.id]
      )

      if (result.rows.length === 0) {
        return res.status(403).json({ error: 'Sem acesso a este workspace' })
      }

      const userRole = result.rows[0].role

      // workspace_admin tem acesso a tudo
      if (userRole === 'workspace_admin') return next()

      if (!roles.includes(userRole)) {
        return res.status(403).json({ error: 'Permissão insuficiente' })
      }

      next()
    } catch {
      return res.status(500).json({ error: 'Erro ao verificar permissões' })
    }
  }
}
