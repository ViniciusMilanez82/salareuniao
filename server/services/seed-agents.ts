/**
 * Insere os 15 agentes template + 3 modos de reunião em um workspace.
 * Usado no registro (novo workspace) e no seed SQL (ws-default).
 * System prompts robustos em seed-agents-prompts.ts.
 */
import { query } from '../db.js'
import { ROBUST_PROMPTS } from '../seed-agents-prompts.js'

const BEHAV = { allow_interruptions: true, ask_questions: true, provide_suggestions: true, debate_style: 'balanced', verbosity: 'moderate', response_length: 'medium' } as const

const AGENTS: Array<{ name: string; slug: string; description: string; role: string; personality: Record<string, number>; tags: string[] }> = [
  { name: 'Visionário de Produto (Simplicidade & Experiência)', slug: 'visionario-produto', description: 'Transforma caos em proposta simples, desejável e vendável.', role: 'Produto & UX', personality: { professionalism: 8, creativity: 6, detail_orientation: 7, assertiveness: 9, empathy: 6, humor: 3 }, tags: ['produto', 'ux', 'mvp', 'simplicidade'] },
  { name: 'Construtor First-Principles (Velocidade & Restrições)', slug: 'construtor-first-principles', description: 'Quebra o problema em fundamentos e cria plano de teste rápido.', role: 'Engenharia & Execução', personality: { professionalism: 8, creativity: 9, detail_orientation: 8, assertiveness: 9, empathy: 4, humor: 2 }, tags: ['first-principles', 'experimentos', 'restrições'] },
  { name: 'Operador de Escala e Obsessão pelo Cliente', slug: 'operador-escala-cliente', description: 'Trabalha de trás pra frente (PR/FAQ), mecanismos e métricas.', role: 'Escala & Cliente', personality: { professionalism: 9, creativity: 6, detail_orientation: 8, assertiveness: 8, empathy: 7, humor: 3 }, tags: ['escala', 'cliente', 'PR/FAQ', 'métricas'] },
  { name: 'Estrategista de Plataforma & Moat', slug: 'estrategista-plataforma', description: 'Posicionamento, empacotamento, defensabilidade e receita.', role: 'Estratégia & Negócio', personality: { professionalism: 9, creativity: 7, detail_orientation: 8, assertiveness: 8, empathy: 5, humor: 2 }, tags: ['estratégia', 'pricing', 'moat', 'go-to-market'] },
  { name: 'Arquiteto de Sistemas (Simplicidade & Manutenibilidade)', slug: 'arquiteto-sistemas', description: 'Corta complexidade, força clareza de invariantes e falhas.', role: 'Arquitetura & Sistemas', personality: { professionalism: 9, creativity: 6, detail_orientation: 9, assertiveness: 8, empathy: 4, humor: 2 }, tags: ['arquitetura', 'simplicidade', 'manutenção'] },
  { name: 'Condutor da Sessão', slug: 'facilitador', description: 'Chair operacional: força decisão, controla fases, corta enrolação.', role: 'Moderador', personality: { professionalism: 9, creativity: 3, detail_orientation: 9, assertiveness: 9, empathy: 4, humor: 1 }, tags: ['facilitação', 'decisão', 'condutor'] },
  { name: 'Relator (Placar da Reunião)', slug: 'relator', description: 'Mantém o placar: opções, decisões, action items. NÃO debate.', role: 'Relator', personality: { professionalism: 9, creativity: 4, detail_orientation: 9, assertiveness: 5, empathy: 5, humor: 2 }, tags: ['ata', 'action items', 'resumo'] },
  { name: 'Red Team (Advogado do Diabo / Pre-mortem)', slug: 'red-team', description: 'Encontra falhas antes de virarem prejuízo.', role: 'Red Team', personality: { professionalism: 8, creativity: 6, detail_orientation: 8, assertiveness: 8, empathy: 4, humor: 3 }, tags: ['riscos', 'pre-mortem', 'advogado do diabo'] },
  { name: 'Analista de Dados & Métricas', slug: 'analista-dados', description: 'Transforma opiniões em hipóteses testáveis e métricas.', role: 'Analytics', personality: { professionalism: 9, creativity: 5, detail_orientation: 9, assertiveness: 6, empathy: 4, humor: 2 }, tags: ['métricas', 'experimentos', 'analytics'] },
  { name: 'Negociador (BATNA / ZOPA / Concessões)', slug: 'negociador', description: 'Prepara estratégia, âncora, roteiro e concessões.', role: 'Negociação', personality: { professionalism: 9, creativity: 5, detail_orientation: 8, assertiveness: 7, empathy: 7, humor: 3 }, tags: ['negociação', 'BATNA', 'ZOPA'] },
  { name: 'Financeiro (ROI / Margem / Sensibilidade)', slug: 'financeiro', description: 'Viabilidade, unit economics, cenários e critérios de GO/NO-GO.', role: 'Financeiro', personality: { professionalism: 9, creativity: 4, detail_orientation: 9, assertiveness: 6, empathy: 4, humor: 2 }, tags: ['ROI', 'margem', 'cenários'] },
  { name: 'Jurídico & Compliance (Contrato + LGPD)', slug: 'juridico-compliance', description: 'Reduz risco contratual, privacidade e responsabilidades.', role: 'Jurídico', personality: { professionalism: 9, creativity: 3, detail_orientation: 9, assertiveness: 6, empathy: 4, humor: 1 }, tags: ['LGPD', 'contrato', 'compliance'] },
  { name: 'Gerente de Projetos / Operações', slug: 'gp-operacoes', description: 'Transforma decisões em cronograma, WBS, RACI e riscos.', role: 'GP / Operações', personality: { professionalism: 9, creativity: 4, detail_orientation: 9, assertiveness: 6, empathy: 5, humor: 2 }, tags: ['projetos', 'WBS', 'RACI'] },
  { name: 'Executivo de Contas (CRM & Pipeline)', slug: 'executivo-contas', description: 'Qualifica, organiza próximo passo e fecha o loop no CRM.', role: 'Vendas', personality: { professionalism: 9, creativity: 5, detail_orientation: 7, assertiveness: 7, empathy: 8, humor: 4 }, tags: ['vendas', 'CRM', 'pipeline'] },
  { name: 'Especialista em Containers & Módulos', slug: 'especialista-containers', description: 'Viabilidade técnica + logística + cronograma real + riscos de campo.', role: 'Containers / Eventos / Offshore', personality: { professionalism: 9, creativity: 5, detail_orientation: 9, assertiveness: 6, empathy: 5, humor: 2 }, tags: ['containers', 'logística', 'offshore'] },
]

export async function seedAgentsForWorkspace(workspaceId: string, userId: string): Promise<void> {
  const personalityBase = { professionalism: 8, creativity: 6, detail_orientation: 7, assertiveness: 6, empathy: 5, humor: 3 }
  for (const a of AGENTS) {
    const system_prompt = ROBUST_PROMPTS[a.slug] ?? ''
    await query(
      `INSERT INTO ai_agents (workspace_id, created_by, name, slug, description, role, system_prompt, personality_traits, behavior_settings, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [workspaceId, userId, a.name, a.slug, a.description, a.role, system_prompt, JSON.stringify({ ...personalityBase, ...a.personality }), JSON.stringify(BEHAV), a.tags]
    )
  }
  // 3 modos de reunião
  await query(
    `INSERT INTO templates (workspace_id, created_by, name, description, template_type, category, config, tags) VALUES
     ($1, $2, 'Brainstorm (Divergir → Convergir)', 'Facilitador → Visionário → Construtor → Operador Escala → Red Team → Relator', 'session', 'modo-reuniao', $3, $4),
     ($1, $2, 'Planejamento (Plano executável)', 'Facilitador → GP → Analista Dados → Financeiro → Red Team → Relator', 'session', 'modo-reuniao', $5, $4),
     ($1, $2, 'Negociação com cliente', 'Executivo Contas → Negociador → Jurídico → Financeiro → Relator', 'session', 'modo-reuniao', $6, $4)`,
    [
      workspaceId,
      userId,
      JSON.stringify({ agent_slugs: ['facilitador', 'visionario-produto', 'construtor-first-principles', 'operador-escala-cliente', 'red-team', 'relator'] }),
      ['brainstorm', 'modo'],
      JSON.stringify({ agent_slugs: ['facilitador', 'gp-operacoes', 'analista-dados', 'financeiro', 'red-team', 'relator'] }),
      JSON.stringify({ agent_slugs: ['executivo-contas', 'negociador', 'juridico-compliance', 'financeiro', 'relator'] }),
    ]
  )
}
