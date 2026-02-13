/**
 * Orquestrador de debate - executa um turno
 * Escolhe o próximo agente, chama LLM, salva transcript, opcionalmente pesquisa web
 */
import { query } from '../db.js'
import { generateAgentResponse } from './llm.js'
import { webSearch } from './search.js'
import { getAgentMemories, saveAgentMemory } from './agent-memory.js'

const MAX_CONTEXT_TRANSCRIPTS = 30 // Limitar contexto para não estourar token limit
const LLM_TIMEOUT_MS = 90_000 // 90 segundos de timeout para chamada LLM

export async function runDebateTurn(
  meetingId: string,
  workspaceId: string,
  provider: 'openai' | 'anthropic' = 'openai'
): Promise<{ transcript: Record<string, unknown>; done?: boolean }> {
  // 1. Buscar meeting
  const meetingRes = await query(
    'SELECT id, title, topic, status FROM meetings WHERE id = $1',
    [meetingId]
  )
  if (meetingRes.rows.length === 0) throw new Error('Reunião não encontrada')
  const meeting = meetingRes.rows[0]
  if (meeting.status !== 'in_progress') throw new Error('Reunião não está em andamento')

  // 2. Buscar agentes (com alias explícito para evitar ambiguidade)
  const agentsRes = await query(
    `SELECT ma.agent_id, ma.speaking_order,
            a.name AS agent_name, a.role AS agent_role,
            a.system_prompt, a.model_settings
     FROM meeting_agents ma
     JOIN ai_agents a ON a.id = ma.agent_id
     WHERE ma.meeting_id = $1 ORDER BY ma.speaking_order`,
    [meetingId]
  )
  const agents = agentsRes.rows

  // Guard: sem agentes
  if (agents.length === 0) {
    throw new Error('Nenhum agente na reunião. Adicione agentes antes de iniciar.')
  }

  // 3. Buscar transcrições (limitado às últimas N para controlar custo de token)
  const transcriptsRes = await query(
    `SELECT speaker_name, content, sequence_number FROM transcripts
     WHERE meeting_id = $1 ORDER BY sequence_number DESC LIMIT $2`,
    [meetingId, MAX_CONTEXT_TRANSCRIPTS]
  )
  // Reverter para ordem cronológica
  const transcripts = transcriptsRes.rows.reverse()
  const history = transcripts
    .map((t) => `${t.speaker_name}: ${t.content}`)
    .join('\n\n')

  const topic = [meeting.title, meeting.topic].filter(Boolean).join(' - ') || 'Debate em andamento'

  // 4. Próximo agente: round-robin pelo número de falas
  const speakerCounts: Record<string, number> = {}
  for (const t of transcripts) {
    const name = t.speaker_name?.trim()
    if (name) speakerCounts[name] = (speakerCounts[name] || 0) + 1
  }

  const nextAgent = agents.reduce((min, a) =>
    (speakerCounts[a.agent_name] ?? 0) < (speakerCounts[min.agent_name] ?? 0) ? a : min
  )

  // 5. Buscar memórias do agente
  const memories = await getAgentMemories(nextAgent.agent_id)

  const agentForLLM = {
    name: nextAgent.agent_name,
    role: nextAgent.agent_role,
    system_prompt: nextAgent.system_prompt || '',
    model_settings: nextAgent.model_settings,
  }

  const context = {
    meetingTopic: topic,
    transcriptHistory: history,
    memories: memories || undefined,
  }

  // 6. Chamar LLM com timeout
  let response: string
  try {
    response = await Promise.race([
      generateAgentResponse(agentForLLM, context, workspaceId, provider),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout: a IA demorou mais de 90s para responder. Tente novamente.')), LLM_TIMEOUT_MS)
      ),
    ])
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido na chamada LLM'
    console.error(`Erro LLM (agente: ${nextAgent.agent_name}):`, msg)
    throw new Error(msg)
  }

  if (!response || response.trim().length === 0) {
    throw new Error('A IA retornou uma resposta vazia. Tente novamente.')
  }

  // 7. Web search (apenas se usar formato explícito [pesquisar:...])
  if (response.includes('[pesquisar:')) {
    const match = response.match(/\[pesquisar:([^\]]+)\]/i)
    if (match) {
      const searchQuery = match[1].trim()
      try {
        const searchResults = await webSearch(searchQuery, workspaceId)
        if (searchResults) {
          response += `\n\n[Com base em pesquisa recente: ${searchResults.slice(0, 400)}...]`
          await saveAgentMemory(nextAgent.agent_id, `Pesquisa: ${searchQuery}. Dados úteis.`, {
            sessionId: meetingId,
            importance: 0.7,
          })
        }
      } catch {
        console.error(`Erro na busca web: "${searchQuery}"`)
      }
    }
  }

  // 8. Inserir transcript com sequence number atômico (INSERT + subquery)
  const insertRes = await query(
    `INSERT INTO transcripts (meeting_id, sequence_number, speaker_type, speaker_id, speaker_name, content, content_type, timestamp_start)
     VALUES ($1, (SELECT COALESCE(MAX(sequence_number), 0) + 1 FROM transcripts WHERE meeting_id = $1), 'ai_agent', $2, $3, $4, 'speech', NOW())
     RETURNING sequence_number`,
    [meetingId, nextAgent.agent_id, nextAgent.agent_name, response]
  )
  const nextSeq = insertRes.rows[0].sequence_number

  // 9. Salvar memória do agente
  await saveAgentMemory(nextAgent.agent_id, `Em debate sobre "${topic}": "${response.slice(0, 200)}..."`, {
    sessionId: meetingId,
    importance: 0.5,
  }).catch(() => {}) // Memória é best-effort, não deve travar o turno

  return {
    transcript: {
      sequence_number: nextSeq,
      speaker_name: nextAgent.agent_name,
      speaker_id: nextAgent.agent_id,
      content: response,
    },
  }
}
