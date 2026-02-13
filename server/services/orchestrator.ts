/**
 * Orquestrador de debate PRODUTIVO
 * - Lê meeting_type, objectives, parameters da reunião
 * - Facilitador/Condutor fala a cada 4 turnos para consolidar
 * - Passa meeting system prompt + addendum para o LLM
 * - Valida densidade da resposta (rejeita "concordo" puro)
 */
import { query, pool } from '../db.js'
import { generateAgentResponse } from './llm.js'
import { webSearch } from './search.js'
import { getAgentMemories, saveAgentMemory } from './agent-memory.js'
import { emitToMeeting } from '../socket.js'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const MAX_CONTEXT_TRANSCRIPTS = 12
const MAX_CHARS_PER_TRANSCRIPT = 300
const MAX_SYSTEM_PROMPT_CHARS = 800
const LLM_TIMEOUT_MS = 90_000
const FACILITATOR_INTERVAL = 4 // Facilitador fala a cada N turnos

// Palavras que indicam resposta de baixa densidade
const LOW_DENSITY_STARTS = [
  'concordo', 'discordo', 'entendo', 'excelente', 'ótimo',
  'interessante', 'muito bem', 'perfeito', 'com certeza',
  'absolutamente', 'sem dúvida', 'é verdade',
]

type AgentRow = {
  agent_id: string
  agent_name: string
  agent_role: string
  system_prompt: string
  model_settings: { model?: string; temperature?: number; maxTokens?: number } | null
  speaking_order: number
  personality_traits?: Record<string, unknown> | null
  behavior_settings?: Record<string, unknown> | null
}

/** Verifica se o agente é o Facilitador/Condutor */
function isFacilitator(agent: AgentRow): boolean {
  const name = agent.agent_name.toLowerCase()
  const role = agent.agent_role.toLowerCase()
  return name.includes('facilitador') || name.includes('condutor') || role === 'moderador'
}

/** Seleciona o próximo agente com lógica inteligente */
function selectNextAgent(
  agents: AgentRow[],
  transcripts: { speaker_name: string; content: string }[],
  turnNumber: number
): AgentRow {
  const facilitator = agents.find(isFacilitator)

  // A cada N turnos, Facilitador consolida (se existir e não for o único)
  if (facilitator && agents.length > 1 && turnNumber > 1 && turnNumber % FACILITATOR_INTERVAL === 0) {
    return facilitator
  }

  // Round-robin normal: quem falou menos
  const speakerCounts: Record<string, number> = {}
  for (const t of transcripts) {
    const name = t.speaker_name?.trim()
    if (name) speakerCounts[name] = (speakerCounts[name] || 0) + 1
  }

  // Excluir facilitador do round-robin normal (ele já tem turnos garantidos)
  const candidates = facilitator && agents.length > 2
    ? agents.filter(a => !isFacilitator(a))
    : agents

  return candidates.reduce((min, a) =>
    (speakerCounts[a.agent_name] ?? 0) < (speakerCounts[min.agent_name] ?? 0) ? a : min
  )
}

/** Valida se a resposta tem densidade mínima (não é só concordância) */
function validateResponseDensity(response: string): { ok: boolean; reason?: string } {
  const lower = response.toLowerCase().trim()

  // Verifica se começa com frase de baixa densidade
  for (const start of LOW_DENSITY_STARTS) {
    if (lower.startsWith(start)) {
      return { ok: false, reason: `Começou com "${start}". Vá direto ao ponto com ENTREGA.` }
    }
  }

  // Verifica se tem pelo menos algum conteúdo útil (bullets, números, opções)
  const hasBullets = response.includes('- ') || response.includes('• ')
  const hasNumbers = /\d+/.test(response)
  const hasStructure = /ENTREGA|PRÓXIMO|ASSUN[ÇC]/i.test(response)

  // Se muito curto e sem estrutura, rejeitar
  if (response.length < 100 && !hasBullets && !hasNumbers) {
    return { ok: false, reason: 'Resposta muito curta sem conteúdo acionável.' }
  }

  return { ok: true }
}

export async function runDebateTurn(
  meetingId: string,
  workspaceId: string,
  provider: 'openai' | 'anthropic' = 'openai'
): Promise<{ transcript: Record<string, unknown>; done?: boolean }> {
  if (!UUID_REGEX.test(meetingId)) {
    throw new Error('ID de reunião inválido. Formato UUID esperado.')
  }
  if (!UUID_REGEX.test(workspaceId)) {
    throw new Error('ID de workspace inválido. Formato UUID esperado.')
  }

  // 1. Buscar meeting COM metadata, meeting_type, objectives, parameters
  const meetingRes = await query(
    `SELECT id, title, topic, status, meeting_type, metadata,
            objectives, parameters
     FROM meetings WHERE id = $1`,
    [meetingId]
  )
  if (meetingRes.rows.length === 0) throw new Error('Reunião não encontrada')
  const meeting = meetingRes.rows[0]
  if (meeting.status !== 'in_progress') throw new Error('Reunião não está em andamento')

  const meetingType = meeting.meeting_type || 'debate'
  const objectives = Array.isArray(meeting.objectives)
    ? meeting.objectives.join('; ')
    : (typeof meeting.objectives === 'string' ? meeting.objectives : '')

  // 2. Buscar agentes (inclui personalidade e comportamento para PRD 4.3.1)
  const agentsRes = await query(
    `SELECT ma.agent_id, ma.speaking_order,
            a.name AS agent_name, a.role AS agent_role,
            a.system_prompt, a.model_settings,
            a.personality_traits, a.behavior_settings
     FROM meeting_agents ma
     JOIN ai_agents a ON a.id = ma.agent_id
     WHERE ma.meeting_id = $1 ORDER BY ma.speaking_order`,
    [meetingId]
  )
  const agents = agentsRes.rows as AgentRow[]

  if (agents.length === 0) {
    throw new Error('Nenhum agente na reunião. Adicione agentes antes de iniciar.')
  }

  // 3. Buscar transcrições
  const transcriptsRes = await query(
    `SELECT speaker_name, content, sequence_number FROM transcripts
     WHERE meeting_id = $1 ORDER BY sequence_number DESC LIMIT $2`,
    [meetingId, MAX_CONTEXT_TRANSCRIPTS]
  )
  const transcripts = transcriptsRes.rows.reverse()
  const history = transcripts
    .map((t) => {
      const content = t.content.length > MAX_CHARS_PER_TRANSCRIPT
        ? t.content.slice(0, MAX_CHARS_PER_TRANSCRIPT) + '...'
        : t.content
      return `${t.speaker_name}: ${content}`
    })
    .join('\n\n')

  const topic = [meeting.title, meeting.topic].filter(Boolean).join(' - ') || 'Debate em andamento'
  const turnNumber = transcripts.length + 1

  // 4. Selecionar próximo agente (Facilitador a cada N turnos)
  const nextAgent = selectNextAgent(agents, transcripts, turnNumber)

  // 5. Buscar memórias e conhecimento
  const memories = await getAgentMemories(nextAgent.agent_id)

  let knowledge = ''
  try {
    const knowledgeRes = await query(
      `SELECT title, content FROM agent_knowledge
       WHERE agent_id = $1 AND is_active = true
       ORDER BY created_at DESC LIMIT 5`,
      [nextAgent.agent_id]
    )
    if (knowledgeRes.rows.length > 0) {
      knowledge = knowledgeRes.rows
        .map((k) => `[${k.title}]: ${k.content.slice(0, 200)}`)
        .join('\n')
    }
  } catch (knowledgeError: unknown) {
    const code = (knowledgeError as { code?: string })?.code
    if (code !== '42P01') {
      console.error(`[CONHECIMENTO] Erro ao buscar conhecimento do agente ${nextAgent.agent_name}:`, knowledgeError)
    }
  }

  // Truncar system_prompt
  let sysPrompt = nextAgent.system_prompt || ''
  if (sysPrompt.length > MAX_SYSTEM_PROMPT_CHARS) {
    sysPrompt = sysPrompt.slice(0, MAX_SYSTEM_PROMPT_CHARS) + '...'
  }

  const otherAgents = agents.map(a => a.agent_name)

  const agentForLLM = {
    name: nextAgent.agent_name,
    role: nextAgent.agent_role,
    system_prompt: sysPrompt,
    model_settings: nextAgent.model_settings ?? undefined,
    personality_traits: nextAgent.personality_traits ?? undefined,
    behavior_settings: nextAgent.behavior_settings ?? undefined,
  }

  const context = {
    meetingTopic: topic,
    transcriptHistory: history,
    memories: memories || undefined,
    knowledge: knowledge || undefined,
    turnNumber,
    otherAgents,
    meetingType,
    objectives: objectives || undefined,
  }

  // 6. Chamar LLM com timeout
  let response: string
  try {
    response = await Promise.race([
      generateAgentResponse(agentForLLM, context, workspaceId, provider),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout: a IA demorou mais de 90s para responder.')), LLM_TIMEOUT_MS)
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

  // 7. Validar densidade — se baixa, re-chamar com prompt de correção (1 retry)
  const density = validateResponseDensity(response)
  if (!density.ok) {
    console.warn(`Baixa densidade (${nextAgent.agent_name}): ${density.reason}. Re-chamando...`)
    try {
      const retryContext = {
        ...context,
        transcriptHistory: history + `\n\n${nextAgent.agent_name}: ${response}\n\n[SISTEMA: Resposta rejeitada — ${density.reason} Refaça com ENTREGA concreta em bullets.]`,
      }
      const retry = await Promise.race([
        generateAgentResponse(agentForLLM, retryContext, workspaceId, provider),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout retry')), LLM_TIMEOUT_MS)),
      ])
      if (retry && retry.trim().length > 0) {
        response = retry
      }
    } catch (err: unknown) {
      console.warn('Erro ignorado (retry LLM):', err instanceof Error ? err.message : err)
    }
  }

  // 8. Web search
  if (response.includes('[pesquisar:')) {
    const match = response.match(/\[pesquisar:([^\]]+)\]/i)
    if (match) {
      const searchQuery = match[1].trim()
      try {
        const searchResults = await webSearch(searchQuery, workspaceId)
        if (searchResults) {
          response += `\n\n[Pesquisa: ${searchResults.slice(0, 400)}]`
          await saveAgentMemory(nextAgent.agent_id, `Pesquisa: ${searchQuery}`, {
            sessionId: meetingId, importance: 0.7,
          })
        }
      } catch (searchError) {
        console.warn(`[PESQUISA] Falha na busca web para "${searchQuery}":`, searchError)
        response += '\n\n[Nota: A pesquisa web não pôde ser realizada neste momento.]'
      }
    }
  }

  // 9. Salvar transcript (com lock para evitar race condition em sequence_number)
  const client = await pool.connect()
  let insertRes: { rows: { id: string; sequence_number: number; speaker_name: string; speaker_id: string; content: string }[] }
  try {
    await client.query('BEGIN')
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [meetingId])
    insertRes = await client.query(
      `INSERT INTO transcripts (meeting_id, sequence_number, speaker_type, speaker_id, speaker_name, content, content_type, timestamp_start)
       VALUES ($1, (SELECT COALESCE(MAX(sequence_number), 0) + 1 FROM transcripts WHERE meeting_id = $1), 'ai_agent', $2, $3, $4, 'speech', NOW())
       RETURNING id, sequence_number, speaker_name, speaker_id, content`,
      [meetingId, nextAgent.agent_id, nextAgent.agent_name, response]
    )
    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {})
    throw e
  } finally {
    client.release()
  }
  const row = insertRes.rows[0]
  const nextSeq = row.sequence_number
  const transcriptPayload = {
    id: row.id,
    sequence_number: nextSeq,
    speaker_name: nextAgent.agent_name,
    speaker_id: nextAgent.agent_id,
    content: response,
  }
  emitToMeeting(meetingId, 'transcript', transcriptPayload)

  // 10. Salvar memória
  const memoryContent = [
    `Sessão "${topic}" (turno ${nextSeq})`,
    `Contribuição: ${response.slice(0, 150)}`,
    transcripts.length > 0 ? `Último: ${transcripts[transcripts.length - 1]?.content?.slice(0, 100)}` : '',
  ].filter(Boolean).join(' | ')

  try {
    await saveAgentMemory(nextAgent.agent_id, memoryContent, {
      sessionId: meetingId,
      importance: Math.min(0.4 + (nextSeq * 0.05), 0.9),
      memoryType: 'episodic',
    })
  } catch (memoryError) {
    console.error(`[MEMÓRIA] Falha ao salvar memória do agente ${nextAgent.agent_name}:`, memoryError)
  }

  return {
    transcript: {
      sequence_number: nextSeq,
      speaker_name: nextAgent.agent_name,
      speaker_id: nextAgent.agent_id,
      content: response,
    },
  }
}
