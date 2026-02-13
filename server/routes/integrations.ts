import { Router, Response } from 'express'
import { query } from '../db.js'
import { authMiddleware, AuthRequest, canAccessWorkspace } from '../middleware/auth.js'
import { encrypt } from '../lib/encrypt.js'

const router = Router()
router.use(authMiddleware)

const PROVIDERS = ['openai', 'anthropic', 'elevenlabs', 'serper'] as const
const PROVIDER_LABELS: Record<string, string> = {
  openai: 'OpenAI (GPT)',
  anthropic: 'Anthropic (Claude)',
  elevenlabs: 'ElevenLabs (TTS)',
  serper: 'Serper (Web Search)',
}

// GET /api/integrations - listar status (sem expor chaves)
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = req.query.workspace_id as string
    if (!workspaceId) return res.status(400).json({ error: 'workspace_id obrigatório' })
    if (!req.user?.id) return res.status(401).json({ error: 'Não autenticado' })
    const allowed = await canAccessWorkspace(workspaceId, req.user.id)
    if (!allowed) return res.status(403).json({ error: 'Sem acesso a este workspace' })

    const resDb = await query(
      `SELECT provider, api_key_prefix, is_active, config
       FROM integration_settings
       WHERE (workspace_id = $1 OR workspace_id IS NULL)
       ORDER BY provider`,
      [workspaceId]
    )

    const status = PROVIDERS.map((p) => {
      const row = resDb.rows.find((r) => r.provider === p)
      return {
        provider: p,
        label: PROVIDER_LABELS[p] || p,
        configured: !!row?.api_key_prefix,
        is_active: row?.is_active ?? false,
      }
    })
    return res.json(status)
  } catch (err: any) {
    console.error('Erro ao listar integrações:', err)
    return res.status(500).json({ error: 'Erro interno' })
  }
})

// PUT /api/integrations/:provider - salvar API key (criptografada se ENCRYPTION_KEY estiver definida)
router.put('/:provider', async (req: AuthRequest, res: Response) => {
  try {
    const provider = typeof req.params.provider === 'string' ? req.params.provider : req.params.provider[0]
    if (!(PROVIDERS as readonly string[]).includes(provider)) {
      return res.status(400).json({ error: `Provider inválido. Use: ${PROVIDERS.join(', ')}` })
    }

    const { api_key, workspace_id } = req.body
    const workspaceId = workspace_id
    if (!workspaceId) return res.status(400).json({ error: 'workspace_id obrigatório' })
    if (!req.user?.id) return res.status(401).json({ error: 'Não autenticado' })
    const allowed = await canAccessWorkspace(workspaceId, req.user.id)
    if (!allowed) return res.status(403).json({ error: 'Sem acesso a este workspace' })

    if (!api_key || typeof api_key !== 'string') {
      return res.status(400).json({ error: 'api_key é obrigatória' })
    }

    const keyPrefix = api_key.slice(0, 8) + '...'
    const valueToStore = encrypt(api_key.trim())

    await query(
      `INSERT INTO integration_settings (workspace_id, provider, api_key_encrypted, api_key_prefix, is_active, updated_at)
       VALUES ($1, $2, $3, $4, true, NOW())
       ON CONFLICT (workspace_id, provider)
       DO UPDATE SET api_key_encrypted = $3, api_key_prefix = $4, is_active = true, updated_at = NOW()`,
      [workspaceId, provider, valueToStore, keyPrefix]
    )

    return res.json({ success: true, message: `${PROVIDER_LABELS[provider as string] || provider} configurado` })
  } catch (err: any) {
    console.error('Erro ao salvar integração:', err)
    return res.status(500).json({ error: 'Erro interno' })
  }
})

// DELETE /api/integrations/:provider - remover
router.delete('/:provider', async (req: AuthRequest, res: Response) => {
  try {
    const provider = typeof req.params.provider === 'string' ? req.params.provider : req.params.provider[0]
    const workspaceId = req.query.workspace_id as string
    if (!workspaceId) return res.status(400).json({ error: 'workspace_id obrigatório' })
    if (!req.user?.id) return res.status(401).json({ error: 'Não autenticado' })
    const allowed = await canAccessWorkspace(workspaceId, req.user.id)
    if (!allowed) return res.status(403).json({ error: 'Sem acesso a este workspace' })

    await query(
      'DELETE FROM integration_settings WHERE workspace_id = $1 AND provider = $2',
      [workspaceId, provider]
    )
    return res.json({ success: true })
  } catch (err: any) {
    console.error('Erro ao remover integração:', err)
    return res.status(500).json({ error: 'Erro interno' })
  }
})

export default router
