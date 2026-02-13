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

const MAX_CONTEXT_TRANSCRIPTS = 20
const MAX_CHARS_PER_TRANSCRIPT = 500
const MAX_SYSTEM_PROMPT_CHARS = 800
const LLM_TIMEOUT_MS = 90_000
const FACILITATOR_INTERVAL = 4
const THINK_TIMEOUT_MS = 60_000

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

/** Detecta se a conversa está em loop (mesmo tema sem progresso) */
function detectLoop(transcripts: { speaker_name: string; content: string }[]): boolean {
  if (transcripts.length < 6) return false
  const last6 = transcripts.slice(-6).map(t => t.content.toLowerCase())
  const keywords = last6.flatMap(c => c.split(/\s+/).filter(w => w.length > 5))
  const freq: Record<string, number> = {}
  for (const w of keywords) freq[w] = (freq[w] || 0) + 1
  const repeatedWords = Object.values(freq).filter(count => count >= 4).length
  return repeatedWords > 3
}

/** Seleciona o próximo agente com lógica conversacional */
function selectNextAgent(
  agents: AgentRow[],
  transcripts: { speaker_name: string; content: string }[],
  turnNumber: number
): AgentRow {
  const facilitator = agents.find(isFacilitator)

  if (facilitator && agents.length > 1 && turnNumber > 1 && turnNumber % FACILITATOR_INTERVAL === 0) {
    return facilitator
  }

  const relator = agents.find(a => a.agent_role.toLowerCase() === 'relator')
  if (relator && turnNumber > 1 && turnNumber % 8 === 0) {
    return relator
  }

  const speakerCounts: Record<string, number> = {}
  for (const t of transcripts) {
    const name = t.speaker_name?.trim()
    if (name) speakerCounts[name] = (speakerCounts[name] || 0) + 1
  }

  const excludeRoles = ['moderador', 'relator']
  const candidates = agents.filter(a =>
    !isFacilitator(a) && !excludeRoles.includes(a.agent_role.toLowerCase())
  )

  if (candidates.length === 0) return agents[0]
  return candidates.reduce((min, a) =>
    (speakerCounts[a.agent_name] ?? 0) < (speakerCounts[min.agent_name] ?? 0) ? a : min
  )
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

  // 3. Buscar transcrições (inclui speaker_type para destacar CEO)
  const transcriptsRes = await query(
    `SELECT speaker_name, speaker_type, content, sequence_number FROM transcripts
     WHERE meeting_id = $1 ORDER BY sequence_number DESC LIMIT $2`,
    [meetingId, MAX_CONTEXT_TRANSCRIPTS]
  )
  const transcripts = transcriptsRes.rows as { speaker_name: string; speaker_type?: string; content: string; sequence_number: number }[]
  const transcriptsReversed = [...transcripts].reverse()
  const history = transcriptsReversed
    .map((t) => {
      const content = t.content.length > MAX_CHARS_PER_TRANSCRIPT
        ? t.content.slice(0, MAX_CHARS_PER_TRANSCRIPT) + '...'
        : t.content
      const isHuman = t.speaker_type === 'human' || t.speaker_type === 'user'
      if (isHuman) {
        return `⚠️ [CEO/USUÁRIO] ${t.speaker_name}: ${content} ⚠️ [DIRETIVA — OBEDEÇA]`
      }
      return `${t.speaker_name}: ${content}`
    })
    .join('\n\n')

  const topic = [meeting.title, meeting.topic].filter(Boolean).join(' - ') || 'Debate em andamento'
  const turnNumber = transcripts.length + 1

  // 4. Selecionar próximo agente
  let nextAgent = selectNextAgent(agents, transcriptsReversed, turnNumber)

  // Detectar loop e forçar intervenção do Condutor
  const isLooping = detectLoop(transcriptsReversed)
  if (isLooping && agents.find(isFacilitator)) {
    const facilitator = agents.find(isFacilitator)!
    if (nextAgent.agent_id !== facilitator.agent_id) {
      console.log('[LOOP DETECTADO] Forçando intervenção do Condutor')
      nextAgent = facilitator as AgentRow
    }
  }

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

  const context: Record<string, unknown> = {
    meetingTopic: topic,
    transcriptHistory: history,
    memories: memories || undefined,
    knowledge: knowledge || undefined,
    turnNumber,
    otherAgents,
    meetingType,
    objectives: objectives || undefined,
    loopDetected: isLooping,
  }

  // 6. Pipeline Inner Monologue: PENSAR → PESQUISAR → FALAR
  let response: string
  try {
    console.log(`[INNER MONOLOGUE] ${nextAgent.agent_name} está pensando...`)
    const thinkContext = { ...context, isThinking: true }
    const innerMonologue = await Promise.race([
      generateAgentResponse(agentForLLM, thinkContext as Parameters<typeof generateAgentResponse>[1], workspaceId, provider),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout: pensamento demorou mais de 60s.')), THINK_TIMEOUT_MS)
      ),
    ])
    console.log(`[INNER MONOLOGUE] ${nextAgent.agent_name} pensou: ${innerMonologue.slice(0, 200)}...`)

    emitToMeeting(meetingId, 'agent_thinking', {
      agent_name: nextAgent.agent_name,
      agent_id: nextAgent.agent_id,
      status: 'thinking',
    })

    let searchResults = ''
    const searchMatch = innerMonologue.match(/\[PESQUISAR:\s*([^\]]+)\]/i)
    if (searchMatch) {
      const searchQuery = searchMatch[1].trim()
      console.log(`[PESQUISA PROATIVA] ${nextAgent.agent_name} pesquisando: "${searchQuery}"`)
      emitToMeeting(meetingId, 'agent_thinking', {
        agent_name: nextAgent.agent_name,
        agent_id: nextAgent.agent_id,
        status: 'researching',
        query: searchQuery,
      })
      try {
        const rawResults = await webSearch(searchQuery, workspaceId)
        if (rawResults) {
          searchResults = rawResults.slice(0, 1500)
          await saveAgentMemory(nextAgent.agent_id, `Pesquisa: ${searchQuery} → ${searchResults.slice(0, 300)}`, {
            sessionId: meetingId,
            importance: 0.8,
            memoryType: 'semantic',
          })
        }
      } catch (searchErr) {
        console.warn('[PESQUISA PROATIVA] Falha:', searchErr)
      }
    }

    const speechContext = {
      ...context,
      isThinking: false,
      innerMonologue,
      searchResults,
    }
    response = await Promise.race([
      generateAgentResponse(agentForLLM, speechContext as Parameters<typeof generateAgentResponse>[1], workspaceId, provider),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout: fala demorou mais de 90s.')), LLM_TIMEOUT_MS)
      ),
    ])
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    console.error(`Erro no pipeline (agente: ${nextAgent.agent_name}):`, msg)
    throw new Error(msg)
  }

  if (!response || response.trim().length === 0) {
    throw new Error('A IA retornou uma resposta vazia. Tente novamente.')
  }

  // 7. Salvar transcript (lock para evitar race condition em sequence_number)
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
