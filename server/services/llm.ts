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

  const openai = new OpenAI({ apiKey, timeout: 60000 })
  const model = options.model || 'gpt-4o-mini'
  try {
    const response = await openai.chat.completions.create({
      model,
      messages: messages as OpenAI.Chat.ChatCompletionMessageParam[],
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2000,
    })
    const content = response.choices[0]?.message?.content?.trim()
    if (!content) throw new Error('Resposta vazia do modelo.')
    return content
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string }
    const safeMessage =
      err?.status === 429
        ? 'Limite de requisições da API atingido. Tente novamente em alguns segundos.'
        : err?.status === 401
          ? 'Chave de API inválida ou expirada. Verifique em Admin > Integrações.'
          : 'Erro ao gerar resposta do agente. Tente novamente.'
    console.error('[LLM] Erro OpenAI (' + model + '):', err?.message || error)
    throw new Error(safeMessage)
  }
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

// Regras de conversa natural (substitui o formato robótico ENTREGA/ASSUNÇÕES/PRÓXIMO PASSO)
const NATURAL_CONVERSATION_ADDENDUM = `
=== REGRAS DE CONVERSA (OBRIGATÓRIO — siga TODAS) ===

1. FORMATO NATURAL: Fale como um profissional em uma reunião real. Use parágrafos curtos e naturais. NUNCA use o formato "ENTREGA / ASSUNÇÕES / PRÓXIMO PASSO". NUNCA use bullets como estrutura principal. Fale como se estivesse conversando.

2. TAMANHO: Máximo 4-5 frases por fala. Seja direto. Se precisa de mais espaço, peça a palavra novamente depois.

3. REAJA AOS OUTROS: Comece sua fala reagindo ao que foi dito antes:
   - "Concordo com [NOME] sobre [PONTO], e quero adicionar que..."
   - "Discordo do [NOME] nesse ponto. Na minha experiência..."
   - "Isso me preocupa. Se fizermos [X], o risco é [Y]."
   - "Boa ideia, [NOME]. E se a gente combinasse isso com [Z]?"

4. USE DADOS REAIS: Se seu pensamento interno gerou uma pesquisa, CITE os dados na sua fala. Diga "Pesquisei aqui e encontrei que..." ou "Segundo dados de mercado, o custo médio é de R$ X...". NUNCA invente números.

5. OBEDEÇA O CEO: Quando o usuário humano (CEO/dono) falar, trate como DIRETIVA. Confirme o recebimento e aja imediatamente. Exemplo: "Entendido, Vinicius. Vamos focar em hotelaria. Minha primeira contribuição nesse sentido é..."

6. TOME POSIÇÃO: Não fique em cima do muro. Diga "Eu recomendo [X] porque [Y]" em vez de "Podemos considerar A, B ou C".

7. FAÇA PERGUNTAS DIRETAS: Se precisa de informação, pergunte diretamente a alguém. "[NOME], quanto tempo levaria para fazer isso?" ou "Vinicius, qual o orçamento disponível?"

8. PROIBIÇÕES ABSOLUTAS:
   - PROIBIDO usar "ENTREGA:", "ASSUNÇÕES:", "PRÓXIMO PASSO:" como headers
   - PROIBIDO listar mais de 3 opções sem recomendar uma
   - PROIBIDO repetir o que outro agente já disse
   - PROIBIDO ignorar diretivas do CEO/usuário
   - PROIBIDO falar mais de 5 frases
`

function formatPersona(agent: {
  name: string
  role: string
  system_prompt?: string
  personality_traits?: Record<string, unknown> | null
  behavior_settings?: Record<string, unknown> | null
 }): string {
  const parts = [`Você é ${agent.name}, um especialista em ${agent.role}.`]
  if (agent.personality_traits && Object.keys(agent.personality_traits).length > 0) {
    const traits = Object.entries(agent.personality_traits)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ')
    parts.push(`Seus traços de personalidade: ${traits}.`)
  }
  if (agent.behavior_settings && Object.keys(agent.behavior_settings).length > 0) {
    const rules = typeof agent.behavior_settings === 'object' && !Array.isArray(agent.behavior_settings)
      ? Object.entries(agent.behavior_settings).map(([k, v]) => `- ${k}: ${JSON.stringify(v)}`).join('\n')
      : String(agent.behavior_settings)
    parts.push(`Suas regras de comportamento:\n${rules}`)
  }
  if (agent.system_prompt) parts.push(agent.system_prompt)
  return parts.join('\n\n')
}

export async function generateAgentResponse(
  agent: {
    system_prompt: string
    role: string
    name: string
    model_settings?: { model?: string; temperature?: number }
    personality_traits?: Record<string, unknown> | null
    behavior_settings?: Record<string, unknown> | null
  },
  context: {
    meetingTopic: string
    transcriptHistory: string
    memories?: string
    knowledge?: string
    turnNumber?: number
    otherAgents?: string[]
    meetingType?: string
    objectives?: string
    isThinking?: boolean
    innerMonologue?: string
    searchResults?: string
    loopDetected?: boolean
  },
  workspaceId: string,
  provider: 'openai' | 'anthropic' = 'openai'
): Promise<string> {
  const otherNames = (context.otherAgents || []).filter((n: string) => n !== agent.name)
  const meetingType = context.meetingType || 'debate'

  // ============================================================
  // MODO PENSAMENTO (INNER MONOLOGUE)
  // ============================================================
  if (context.isThinking) {
    const loopAlert = context.loopDetected
      ? '\n⚠️ ALERTA: A conversa está em LOOP. Você DEVE forçar uma decisão ou mudar o rumo da conversa. Não repita o que já foi dito.'
      : ''
    const thinkSystemPrompt = `Você é o subconsciente de ${agent.name}, um especialista em ${agent.role}.
Antes de falar na reunião, você precisa organizar seus pensamentos internamente.

${agent.system_prompt ? `SUA EXPERTISE E MENTALIDADE:\n${agent.system_prompt}\n` : ''}
${context.memories ? `SUAS MEMÓRIAS DE REUNIÕES ANTERIORES:\n${context.memories}\n` : ''}
${context.knowledge ? `SEU CONHECIMENTO ESPECIALIZADO:\n${context.knowledge}\n` : ''}
TEMA DA REUNIÃO: ${context.meetingTopic}
${context.objectives ? `OBJETIVOS: ${context.objectives}` : ''}
OUTROS PARTICIPANTES: ${otherNames.join(', ')}
${loopAlert}

INSTRUÇÕES PARA O SEU MONÓLOGO INTERNO:
1. ANALISE a última fala: O que foi dito? Qual a implicação para o projeto?
2. IDENTIFIQUE se o CEO/usuário deu alguma diretiva. Se sim, ela é PRIORIDADE MÁXIMA.
3. REFLITA: A conversa está progredindo ou estamos em loop? O que está faltando?
4. DECIDA sua posição: Qual é a SUA opinião profissional sobre o que está sendo discutido?
5. VERIFIQUE se você precisa de DADOS REAIS para embasar sua posição. Se sim, escreva EXATAMENTE: [PESQUISAR: sua pergunta específica aqui]. Exemplos:
   - [PESQUISAR: custo médio construção módulo habitacional container 2025 Brasil]
   - [PESQUISAR: mercado hotelaria modular tendências 2025]
   - [PESQUISAR: concorrentes módulos habitacionais container Brasil]
6. PLANEJE sua fala: O que você vai dizer? Qual o ponto principal?

Responda APENAS com seu pensamento interno. Isso NÃO será mostrado na reunião.`

    const thinkUserMessage = `Conversa até agora:\n${context.transcriptHistory}\n\nTurno: ${context.turnNumber ?? '?'}\nSua vez de pensar, ${agent.name}.`

    const opts = { model: 'gpt-4o-mini', temperature: 0.5, maxTokens: 800 }
    if (provider === 'anthropic') {
      return completeWithAnthropic(thinkSystemPrompt, thinkUserMessage, workspaceId, opts)
    }
    return completeWithOpenAI(
      [{ role: 'system', content: thinkSystemPrompt }, { role: 'user', content: thinkUserMessage }],
      workspaceId,
      opts
    )
  }

  // ============================================================
  // MODO FALA (resposta final — com base no pensamento e pesquisa)
  // ============================================================
  const isFirstTurn = !context.transcriptHistory || context.transcriptHistory === '(Início do debate)'

  const speechSystemPrompt = [
    getMeetingSystemPrompt(meetingType, context.objectives),
    '',
    formatPersona(agent),
    '',
    context.knowledge ? `Seu conhecimento especializado:\n${context.knowledge}` : '',
    context.memories ? `Aprendizados de reuniões anteriores:\n${context.memories}` : '',
    otherNames.length > 0 ? `Outros participantes: ${otherNames.join(', ')}.` : '',
    `Tema: ${context.meetingTopic}`,
    context.turnNumber ? `Turno atual: ${context.turnNumber}` : '',
    '',
    context.innerMonologue
      ? `=== SEU PENSAMENTO INTERNO (use como guia, NÃO copie literalmente) ===\n${context.innerMonologue}`
      : '',
    '',
    context.searchResults
      ? `=== DADOS DA SUA PESQUISA WEB (cite esses dados na sua fala para embasá-la) ===\n${context.searchResults}`
      : '',
    '',
    NATURAL_CONVERSATION_ADDENDUM,
  ]
    .filter(Boolean)
    .join('\n')

  const speechUserMessage = isFirstTurn
    ? `Reunião começando. Tema: "${context.meetingTopic}"\nTipo: ${meetingType}\n${context.objectives ? `Objetivos: ${context.objectives}` : ''}\n\nSua vez, ${agent.name}. Apresente-se brevemente e faça sua primeira contribuição. Fale como um profissional em uma reunião real — natural, direto e com personalidade.`
    : `Conversa até agora:\n${context.transcriptHistory}\n\nSua vez, ${agent.name}. Responda naturalmente, como em uma reunião real. Construa sobre o que foi dito, reaja, discorde se necessário, e avance a conversa.`

  const opts = {
    model: agent.model_settings?.model as string | undefined,
    temperature: agent.model_settings?.temperature ?? 0.8,
    maxTokens: 500,
  }

  if (provider === 'anthropic') {
    return completeWithAnthropic(speechSystemPrompt, speechUserMessage, workspaceId, opts)
  }
  return completeWithOpenAI(
    [{ role: 'system', content: speechSystemPrompt }, { role: 'user', content: speechUserMessage }],
    workspaceId,
    opts
  )
}
