import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { query } from '../db.js'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret'

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
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as jwt.SignOptions
  )
}

export function verifyToken(token: string): AuthUser {
  return jwt.verify(token, JWT_SECRET) as AuthUser
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

    // Atualizar last_active_at
    query('UPDATE users SET last_active_at = NOW() WHERE id = $1', [decoded.id]).catch(() => {})

    next()
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado' })
    }
    return res.status(401).json({ error: 'Token inválido' })
  }
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
