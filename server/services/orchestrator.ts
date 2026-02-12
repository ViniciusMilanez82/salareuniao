/**
 * Orquestrador de debate - executa um turno
 * Escolhe o próximo agente, chama LLM, salva transcript, opcionalmente pesquisa web
 */
import { query } from '../db.js'
import { generateAgentResponse } from './llm.js'
import { webSearch } from './search.js'
import { getAgentMemories, saveAgentMemory } from './agent-memory.js'

export async function runDebateTurn(
  meetingId: string,
  workspaceId: string,
  provider: 'openai' | 'anthropic' = 'openai'
): Promise<{ transcript: Record<string, unknown>; done?: boolean }> {
  const meetingRes = await query(
    'SELECT id, title, topic, status FROM meetings WHERE id = $1',
    [meetingId]
  )
  if (meetingRes.rows.length === 0) throw new Error('Reunião não encontrada')
  const meeting = meetingRes.rows[0]
  if (meeting.status !== 'in_progress') throw new Error('Reunião não está em andamento')

  const agentsRes = await query(
    `SELECT ma.agent_id, ma.speaking_order, a.name, a.role, a.system_prompt, a.model_settings
     FROM meeting_agents ma
     JOIN ai_agents a ON a.id = ma.agent_id
     WHERE ma.meeting_id = $1 ORDER BY ma.speaking_order`,
    [meetingId]
  )
  const agents = agentsRes.rows

  const transcriptsRes = await query(
    'SELECT speaker_name, content, sequence_number FROM transcripts WHERE meeting_id = $1 ORDER BY sequence_number',
    [meetingId]
  )
  const history = transcriptsRes.rows
    .map((t) => `${t.speaker_name}: ${t.content}`)
    .join('\n\n')

  const topic = [meeting.title, meeting.topic].filter(Boolean).join(' - ') || 'Debate em andamento'

  // Próximo agente: round-robin pelo número de falas
  const speakerCounts = history.split('\n\n').reduce((acc: Record<string, number>, line) => {
    const name = line.split(':')[0]?.trim()
    if (name) acc[name] = (acc[name] || 0) + 1
    return acc
  }, {})
  const nextAgent = agents.reduce((min, a) =>
    (speakerCounts[a.agent_name] ?? 0) < (speakerCounts[min.agent_name] ?? 0) ? a : min
  )

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

  let response = await generateAgentResponse(
    agentForLLM,
    context,
    workspaceId,
    provider
  )

  // Extrair menção a "pesquisar" e executar busca (simplificado)
  if (response.toLowerCase().includes('[pesquisar:') || response.toLowerCase().includes('pesquisar ')) {
    const match = response.match(/\[pesquisar:([^\]]+)\]/i) || response.match(/pesquisar[:\s]+([^.]+)/i)
    if (match) {
      const searchQuery = match[1].trim()
      const searchResults = await webSearch(searchQuery, workspaceId)
      if (searchResults) {
        response += `\n\n[Com base em pesquisa recente: ${searchResults.slice(0, 400)}...]`
        await saveAgentMemory(nextAgent.agent_id, `Pesquisa: ${searchQuery}. Dados úteis.`, {
          sessionId: meetingId,
          importance: 0.7,
        })
      }
    }
  }

  const seqRes = await query(
    'SELECT COALESCE(MAX(sequence_number), 0) + 1 as next_seq FROM transcripts WHERE meeting_id = $1',
    [meetingId]
  )
  const nextSeq = seqRes.rows[0].next_seq

  await query(
    `INSERT INTO transcripts (meeting_id, sequence_number, speaker_type, speaker_id, speaker_name, content, content_type, timestamp_start)
     VALUES ($1, $2, 'ai_agent', $3, $4, $5, 'speech', NOW())`,
    [meetingId, nextSeq, nextAgent.agent_id, nextAgent.name, response]
  )

  await saveAgentMemory(nextAgent.agent_id, `Em debate sobre "${topic}": "${response.slice(0, 200)}..."`, {
    sessionId: meetingId,
    importance: 0.5,
  })

  return {
    transcript: {
      sequence_number: nextSeq,
      speaker_name: nextAgent.name,
      speaker_id: nextAgent.agent_id,
      content: response,
    },
  }
}
