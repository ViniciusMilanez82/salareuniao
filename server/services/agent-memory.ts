/**
 * Memória de agentes - salva insights e aprendizados
 * Validação de entrada e tratamento de erros (auditoria AAA)
 */
import { query } from '../db.js'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function getAgentMemories(agentId: string, limit = 10): Promise<string> {
  if (!UUID_REGEX.test(agentId)) {
    console.warn('[MEMÓRIA] agentId inválido:', agentId)
    return ''
  }
  const cappedLimit = Math.min(limit, 50)
  try {
    const res = await query(
      `SELECT id, content, importance_score FROM agent_memories
       WHERE agent_id = $1 AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY importance_score DESC, last_accessed_at DESC NULLS LAST
       LIMIT $2`,
      [agentId, cappedLimit]
    )
    if (res.rows.length > 0) {
      const ids = (res.rows as { id?: string }[]).map((r) => r.id).filter(Boolean)
      if (ids.length > 0) {
        query(
          `UPDATE agent_memories SET last_accessed_at = NOW() WHERE id = ANY($1)`,
          [ids]
        ).catch(() => {})
      }
    }
    return (res.rows as { content: string }[]).map((r) => r.content).join('\n')
  } catch (error) {
    console.error('[MEMÓRIA] Erro ao buscar memórias do agente', agentId, error)
    return ''
  }
}

export async function saveAgentMemory(
  agentId: string,
  content: string,
  options: { sessionId?: string; importance?: number; memoryType?: string } = {}
): Promise<void> {
  if (!UUID_REGEX.test(agentId)) {
    throw new Error('agentId inválido: ' + agentId)
  }
  if (!content || content.trim().length === 0) {
    console.warn('[MEMÓRIA] Tentativa de salvar memória vazia. Ignorando.')
    return
  }
  const sanitizedContent = content.slice(0, 2000)
  const importance = Math.max(0, Math.min(1, options.importance ?? 0.6))
  await query(
    `INSERT INTO agent_memories (agent_id, content, memory_type, importance_score, source_session_id)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      agentId,
      sanitizedContent,
      options.memoryType || 'semantic',
      importance,
      options.sessionId || null,
    ]
  )
}
