/**
 * Memória de agentes - salva insights e aprendizados
 * Usada para tornar agentes mais inteligentes ao longo do tempo
 */
import { query } from '../db.js'

export async function getAgentMemories(agentId: string, limit = 10): Promise<string> {
  const res = await query(
    `SELECT content, importance_score FROM agent_memories
     WHERE agent_id = $1 AND (expires_at IS NULL OR expires_at > NOW())
     ORDER BY importance_score DESC, last_accessed_at DESC NULLS LAST
     LIMIT $2`,
    [agentId, limit]
  )
  return res.rows.map((r) => r.content).join('\n')
}

export async function saveAgentMemory(
  agentId: string,
  content: string,
  options: { sessionId?: string; importance?: number; memoryType?: string } = {}
): Promise<void> {
  await query(
    `INSERT INTO agent_memories (agent_id, content, memory_type, importance_score, source_session_id)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      agentId,
      content,
      options.memoryType || 'semantic',
      options.importance ?? 0.6,
      options.sessionId || null,
    ]
  )
}
