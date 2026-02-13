/**
 * Serviço LLM - OpenAI e Anthropic
 * Usa integration_settings (criptografadas se ENCRYPTION_KEY) ou env vars
 */
import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import { query } from '../db.js'
import { decrypt } from '../lib/encrypt.js'

type LLMOptions = {
  model?: string
  temperature?: number
  maxTokens?: number
}

export async function getIntegrationKey(
  workspaceId: string,
  provider: 'openai' | 'anthropic'
): Promise<string | null> {
  // 1. Buscar em integration_settings (workspace ou global)
  const res = await query(
    `SELECT api_key_encrypted FROM integration_settings
     WHERE provider = $1 AND is_active = true
     AND (workspace_id = $2 OR workspace_id IS NULL)
     ORDER BY workspace_id DESC NULLS LAST
     LIMIT 1`,
    [provider, workspaceId]
  )
  if (res.rows[0]?.api_key_encrypted) return decrypt(res.rows[0].api_key_encrypted)

  // 2. Fallback para env
  if (provider === 'openai') return process.env.OPENAI_API_KEY || null
  if (provider === 'anthropic') return process.env.ANTHROPIC_API_KEY || null
  return null
}

export async function completeWithOpenAI(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  workspaceId: string,
  options: LLMOptions = {}
): Promise<string> {
  const apiKey = await getIntegrationKey(workspaceId, 'openai')
  if (!apiKey) throw new Error('OpenAI API key não configurada. Configure em Admin > Integrações.')

  const openai = new OpenAI({ apiKey })
  const model = options.model || 'gpt-4o-mini'
  const response = await openai.chat.completions.create({
    model,
    messages: messages as OpenAI.Chat.ChatCompletionMessageParam[],
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 2000,
  })
  return response.choices[0]?.message?.content?.trim() || ''
}

export async function completeWithAnthropic(
  systemPrompt: string,
  userMessage: string,
  workspaceId: string,
  options: LLMOptions = {}
): Promise<string> {
  const apiKey = await getIntegrationKey(workspaceId, 'anthropic')
  if (!apiKey) throw new Error('Anthropic API key não configurada. Configure em Admin > Integrações.')

  const anthropic = new Anthropic({ apiKey })
  const model = options.model || 'claude-3-5-haiku-20241022'
  const response = await anthropic.messages.create({
    model,
    max_tokens: options.maxTokens ?? 2000,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  })

  const textBlock = response.content.find((b) => b.type === 'text')
  return textBlock && 'text' in textBlock ? textBlock.text.trim() : ''
}

// ============================================================
// Meeting system prompts por tipo (templates de sessão)
// ============================================================
const MEETING_TEMPLATES: Record<string, string> = {
  brainstorm: `TEMPLATE: BRAINSTORM PRODUTIVO
SAÍDA obrigatória: Top 10 ideias → agrupar → Top 3 → plano 7 dias.
Regras: ninguém pode falar mais de 6 bullets por turno.
Fases: Enquadrar (critérios) → Divergir (10+ ideias) → Convergir (Top 3 com score) → Plano (7 dias + donos).
Stop: quando houver Top 3 com critérios + 1 experimento definido.`,

  debate: `TEMPLATE: DEBATE/DECISÃO
SAÍDA obrigatória: 2-3 opções comparadas por critérios + decisão ou experimento que decide.
Fases: Enquadrar (critérios) → Divergir (opções) → Convergir (comparar + pontuar) → Decidir (escolha + plano).
Stop: quando houver decisão registrada ou teste agendado com métrica.`,

  analysis: `TEMPLATE: PLANEJAMENTO
SAÍDA obrigatória: Escopo IN/OUT + WBS + marcos + RACI + riscos.
Fases: Enquadrar (escopo) → Decompor (etapas + dependências) → Priorizar (caminho crítico) → Planejar (donos + prazos).
Stop: quando existir lista de tarefas com donos e prazos.`,

  strategy: `TEMPLATE: PLANEJAMENTO ESTRATÉGICO
SAÍDA obrigatória: Análise situacional + opções estratégicas + decisão + plano 30 dias.
Fases: Enquadrar (contexto + restrições) → Analisar (opções + trade-offs) → Decidir (recomendação) → Planejar.
Stop: quando houver estratégia escolhida + próximos passos com datas.`,

  negotiation: `TEMPLATE: PREPARAÇÃO DE NEGOCIAÇÃO
SAÍDA obrigatória: BATNA/ZOPA + âncora + concessões + roteiro + próximos passos.
Fases: Mapear (interesses) → Preparar (BATNA + ZOPA + âncora) → Simular (objeções) → Fechar (roteiro + red lines).
Stop: quando houver roteiro de negociação e linhas vermelhas claras.`,

  review: `TEMPLATE: REVISÃO/ANÁLISE
SAÍDA obrigatória: Diagnóstico + recomendações priorizadas + plano de ação.
Fases: Avaliar (estado atual) → Diagnosticar (problemas + causas) → Recomendar (soluções) → Planejar (ações).
Stop: quando houver lista de melhorias priorizadas com donos.`,

  custom: `TEMPLATE: SESSÃO CUSTOMIZADA
SAÍDA obrigatória: Definida pelo usuário no objetivo da reunião.
Fases: Enquadrar → Explorar → Convergir → Decidir + Próximos passos.`,
}

function getMeetingSystemPrompt(meetingType: string, objectives?: string): string {
  const template = MEETING_TEMPLATES[meetingType] || MEETING_TEMPLATES.debate
  const objBlock = objectives ? `\nOBJETIVOS DA SESSÃO:\n${objectives}\n` : ''
  return `${template}${objBlock}`
}

// Addendum injetado em TODOS os agentes (runtime, não no banco)
const PRODUCTIVITY_ADDENDUM = `
=== REGRAS DE PRODUÇÃO (OBRIGATÓRIO — siga TODAS) ===
1) LIMITE DE PERGUNTAS: Máx 1 pergunta por mensagem, máx 2 no total da sessão.
   Se a pergunta não for respondida, ASSUMA premissas plausíveis (liste-as) e AVANCE.

2) TAMANHO: Máx 1400 caracteres. Use bullets. Sem parágrafos longos.

3) ESTRUTURA OBRIGATÓRIA de cada mensagem:
   - ENTREGA: 3-7 bullets com algo utilizável AGORA (opções, números, trade-offs, decisões)
   - ASSUNÇÕES: (se faltou contexto) 2-5 premissas que você está assumindo
   - PRÓXIMO PASSO: 1 ação concreta com dono sugerido e prazo

4) PROIBIÇÕES:
   - PROIBIDO começar com "Concordo", "Discordo", "Entendo", "Excelente", "Ótimo", "Interessante"
   - PROIBIDO "pode ser / depende" sem oferecer 2 opções e recomendar 1
   - PROIBIDO sugerir "vamos fazer análise/pesquisa" sem entregar versão inicial AGORA
   - Se sugerir SWOT/análise/piloto, ENTREGUE a versão inicial com o que sabe + liste o que falta validar

5) CADA FALA deve conter pelo menos 1: opção concreta, número/estimativa, trade-off, risco+mitigação, decisão, ou experimento com métrica.
`

export async function generateAgentResponse(
  agent: { system_prompt: string; role: string; name: string; model_settings?: { model?: string; temperature?: number } },
  context: {
    meetingTopic: string
    transcriptHistory: string
    memories?: string
    knowledge?: string
    turnNumber?: number
    otherAgents?: string[]
    meetingType?: string
    objectives?: string
  },
  workspaceId: string,
  provider: 'openai' | 'anthropic' = 'openai'
): Promise<string> {
  const isFirstTurn = !context.transcriptHistory || context.transcriptHistory === '(Início do debate)'
  const otherNames = (context.otherAgents || []).filter(n => n !== agent.name)
  const meetingType = context.meetingType || 'debate'

  const systemPrompt = [
    // 1. Meeting system prompt (template + objectives)
    getMeetingSystemPrompt(meetingType, context.objectives),
    '',
    // 2. Agent identity
    `Você é ${agent.name}, com expertise em ${agent.role}.`,
    agent.system_prompt || '',
    '',
    // 3. Conhecimento e memórias
    context.knowledge ? `Seu conhecimento especializado:\n${context.knowledge}\n` : '',
    context.memories ? `Aprendizados anteriores:\n${context.memories}\n` : '',
    // 4. Contexto da reunião
    otherNames.length > 0 ? `Outros participantes: ${otherNames.join(', ')}.` : '',
    `Tema: ${context.meetingTopic}`,
    context.turnNumber ? `Turno atual: ${context.turnNumber}` : '',
    // 5. Addendum de produtividade (OBRIGATÓRIO para todos)
    PRODUCTIVITY_ADDENDUM,
  ].filter(Boolean).join('\n')

  const userMessage = isFirstTurn
    ? [
        `Reunião começando. Tema: "${context.meetingTopic}"`,
        `Tipo: ${meetingType}`,
        context.objectives ? `Objetivos: ${context.objectives}` : '',
        '',
        `Sua vez, ${agent.name}. Comece com sua contribuição principal. Siga a estrutura: ENTREGA + ASSUNÇÕES + PRÓXIMO PASSO.`,
      ].filter(Boolean).join('\n')
    : [
        'Conversa até agora:',
        context.transcriptHistory,
        '',
        `Sua vez, ${agent.name}. Avance a discussão com ENTREGA concreta. NÃO repita o que já foi dito. Use bullets:`,
      ].join('\n')

  const opts = {
    model: agent.model_settings?.model as string | undefined,
    temperature: agent.model_settings?.temperature ?? 0.75,
    maxTokens: 700,
  }

  if (provider === 'anthropic') {
    return completeWithAnthropic(systemPrompt, userMessage, workspaceId, opts)
  }
  return completeWithOpenAI(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    workspaceId,
    opts
  )
}
