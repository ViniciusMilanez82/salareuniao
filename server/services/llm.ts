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

export async function generateAgentResponse(
  agent: { system_prompt: string; role: string; name: string; model_settings?: { model?: string; temperature?: number } },
  context: { meetingTopic: string; transcriptHistory: string; memories?: string },
  workspaceId: string,
  provider: 'openai' | 'anthropic' = 'openai'
): Promise<string> {
  const systemPrompt = [
    `Você é ${agent.name}, ${agent.role}.`,
    agent.system_prompt || '',
    '',
    'Contexto da reunião:',
    context.meetingTopic,
    '',
    context.memories ? `Memórias e aprendizados anteriores:\n${context.memories}\n` : '',
    'Instruções: Responda de forma concisa e relevante ao debate. Traga fatos quando apropriado. Seja natural no diálogo.',
  ].join('\n')

  const userMessage = [
    'Histórico da conversa até agora:',
    context.transcriptHistory || '(Início do debate)',
    '',
    'Agora é sua vez de falar. Responda em 1-3 parágrafos, como se estivesse na reunião:',
  ].join('\n')

  if (provider === 'anthropic') {
    return completeWithAnthropic(systemPrompt, userMessage, workspaceId, {
      model: agent.model_settings?.model as string | undefined,
      temperature: agent.model_settings?.temperature ?? 0.7,
    })
  }
  return completeWithOpenAI(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    workspaceId,
    { model: agent.model_settings?.model as string | undefined, temperature: agent.model_settings?.temperature ?? 0.7 }
  )
}
