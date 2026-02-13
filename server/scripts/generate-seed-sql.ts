/**
 * Gera server/seed-agents.sql com os system prompts robustos.
 * Uso: npx tsx server/scripts/generate-seed-sql.ts
 */
import { writeFileSync } from 'fs'
import { join } from 'path'
import { ROBUST_PROMPTS } from '../seed-agents-prompts.js'

const AGENTS: Array<{ name: string; slug: string; description: string; role: string; personality: string; tags: string }> = [
  { name: 'Visionário de Produto (Simplicidade & Experiência)', slug: 'visionario-produto', description: 'Transforma caos em proposta simples, desejável e vendável.', role: 'Produto & UX', personality: '{"professionalism": 8, "creativity": 6, "detail_orientation": 7, "assertiveness": 9, "empathy": 6, "humor": 3}', tags: "ARRAY['produto', 'ux', 'mvp', 'simplicidade']" },
  { name: 'Construtor First-Principles (Velocidade & Restrições)', slug: 'construtor-first-principles', description: 'Quebra o problema em fundamentos e cria plano de teste rápido.', role: 'Engenharia & Execução', personality: '{"professionalism": 8, "creativity": 9, "detail_orientation": 8, "assertiveness": 9, "empathy": 4, "humor": 2}', tags: "ARRAY['first-principles', 'experimentos', 'restrições']" },
  { name: 'Operador de Escala e Obsessão pelo Cliente', slug: 'operador-escala-cliente', description: 'Trabalha de trás pra frente (PR/FAQ), mecanismos e métricas.', role: 'Escala & Cliente', personality: '{"professionalism": 9, "creativity": 6, "detail_orientation": 8, "assertiveness": 8, "empathy": 7, "humor": 3}', tags: "ARRAY['escala', 'cliente', 'PR/FAQ', 'métricas']" },
  { name: 'Estrategista de Plataforma & Moat', slug: 'estrategista-plataforma', description: 'Posicionamento, empacotamento, defensabilidade e receita.', role: 'Estratégia & Negócio', personality: '{"professionalism": 9, "creativity": 7, "detail_orientation": 8, "assertiveness": 8, "empathy": 5, "humor": 2}', tags: "ARRAY['estratégia', 'pricing', 'moat', 'go-to-market']" },
  { name: 'Arquiteto de Sistemas (Simplicidade & Manutenibilidade)', slug: 'arquiteto-sistemas', description: 'Corta complexidade, força clareza de invariantes e falhas.', role: 'Arquitetura & Sistemas', personality: '{"professionalism": 9, "creativity": 6, "detail_orientation": 9, "assertiveness": 8, "empathy": 4, "humor": 2}', tags: "ARRAY['arquitetura', 'simplicidade', 'manutenção']" },
  { name: 'Condutor da Sessão', slug: 'facilitador', description: 'Chair operacional: força decisão, controla fases, corta enrolação.', role: 'Moderador', personality: '{"professionalism": 9, "creativity": 3, "detail_orientation": 9, "assertiveness": 9, "empathy": 4, "humor": 1}', tags: "ARRAY['facilitação', 'decisão', 'condutor']" },
  { name: 'Relator (Placar da Reunião)', slug: 'relator', description: 'Mantém o placar: opções, decisões, action items. NÃO debate.', role: 'Relator', personality: '{"professionalism": 9, "creativity": 4, "detail_orientation": 9, "assertiveness": 5, "empathy": 5, "humor": 2}', tags: "ARRAY['ata', 'action items', 'resumo']" },
  { name: 'Red Team (Advogado do Diabo / Pre-mortem)', slug: 'red-team', description: 'Encontra falhas antes de virarem prejuízo.', role: 'Red Team', personality: '{"professionalism": 8, "creativity": 6, "detail_orientation": 8, "assertiveness": 8, "empathy": 4, "humor": 3}', tags: "ARRAY['riscos', 'pre-mortem', 'advogado do diabo']" },
  { name: 'Analista de Dados & Métricas', slug: 'analista-dados', description: 'Transforma opiniões em hipóteses testáveis e métricas.', role: 'Analytics', personality: '{"professionalism": 9, "creativity": 5, "detail_orientation": 9, "assertiveness": 6, "empathy": 4, "humor": 2}', tags: "ARRAY['métricas', 'experimentos', 'analytics']" },
  { name: 'Negociador (BATNA / ZOPA / Concessões)', slug: 'negociador', description: 'Prepara estratégia, âncora, roteiro e concessões.', role: 'Negociação', personality: '{"professionalism": 9, "creativity": 5, "detail_orientation": 8, "assertiveness": 7, "empathy": 7, "humor": 3}', tags: "ARRAY['negociação', 'BATNA', 'ZOPA']" },
  { name: 'Financeiro (ROI / Margem / Sensibilidade)', slug: 'financeiro', description: 'Viabilidade, unit economics, cenários e critérios de GO/NO-GO.', role: 'Financeiro', personality: '{"professionalism": 9, "creativity": 4, "detail_orientation": 9, "assertiveness": 6, "empathy": 4, "humor": 2}', tags: "ARRAY['ROI', 'margem', 'cenários']" },
  { name: 'Jurídico & Compliance (Contrato + LGPD)', slug: 'juridico-compliance', description: 'Reduz risco contratual, privacidade e responsabilidades.', role: 'Jurídico', personality: '{"professionalism": 9, "creativity": 3, "detail_orientation": 9, "assertiveness": 6, "empathy": 4, "humor": 1}', tags: "ARRAY['LGPD', 'contrato', 'compliance']" },
  { name: 'Gerente de Projetos / Operações', slug: 'gp-operacoes', description: 'Transforma decisões em cronograma, WBS, RACI e riscos.', role: 'GP / Operações', personality: '{"professionalism": 9, "creativity": 4, "detail_orientation": 9, "assertiveness": 6, "empathy": 5, "humor": 2}', tags: "ARRAY['projetos', 'WBS', 'RACI']" },
  { name: 'Executivo de Contas (CRM & Pipeline)', slug: 'executivo-contas', description: 'Qualifica, organiza próximo passo e fecha o loop no CRM.', role: 'Vendas', personality: '{"professionalism": 9, "creativity": 5, "detail_orientation": 7, "assertiveness": 7, "empathy": 8, "humor": 4}', tags: "ARRAY['vendas', 'CRM', 'pipeline']" },
  { name: 'Especialista em Containers & Módulos', slug: 'especialista-containers', description: 'Viabilidade técnica + logística + cronograma real + riscos de campo.', role: 'Containers / Eventos / Offshore', personality: '{"professionalism": 9, "creativity": 5, "detail_orientation": 9, "assertiveness": 6, "empathy": 5, "humor": 2}', tags: "ARRAY['containers', 'logística', 'offshore']" },
]

function escapeSql(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "''")
}

const header = `-- Seed dos 15 agentes (system prompts robustos)
-- Gerado por: npx tsx server/scripts/generate-seed-sql.ts
-- Roda após truncate-keep-agents (workspace ws-default e admin existem)
-- Uso: cat seed-agents.sql | docker compose exec -T postgres psql -U USER -d DB -f -

DO $$
DECLARE
  v_ws_id UUID;
  v_user_id UUID;
  v_behav JSONB := '{"allow_interruptions": true, "ask_questions": true, "provide_suggestions": true, "debate_style": "balanced", "verbosity": "moderate", "response_length": "medium"}'::jsonb;
BEGIN
  SELECT id INTO v_ws_id FROM workspaces WHERE slug = 'ws-default' LIMIT 1;
  SELECT id INTO v_user_id FROM users WHERE email = 'admin@salareuniao.local' LIMIT 1;
  IF v_ws_id IS NULL OR v_user_id IS NULL THEN
    RAISE NOTICE 'Workspace ou admin não encontrado. Execute truncate-keep-agents antes.';
    RETURN;
  END IF;

  DELETE FROM ai_agents WHERE workspace_id = v_ws_id AND slug IN (
    'visionario-produto', 'construtor-first-principles', 'operador-escala-cliente', 'estrategista-plataforma', 'arquiteto-sistemas',
    'facilitador', 'relator', 'red-team', 'analista-dados', 'negociador', 'financeiro', 'juridico-compliance', 'gp-operacoes', 'executivo-contas', 'especialista-containers'
  );

`

const footer = `
  DELETE FROM templates WHERE workspace_id = v_ws_id AND template_type = 'session' AND category = 'modo-reuniao';

  INSERT INTO templates (workspace_id, created_by, name, description, template_type, category, config, tags) VALUES
  (v_ws_id, v_user_id, 'Brainstorm (Divergir → Convergir)', 'Facilitador → Visionário → Construtor → Operador Escala → Red Team → Relator', 'session', 'modo-reuniao', '{"agent_slugs": ["facilitador", "visionario-produto", "construtor-first-principles", "operador-escala-cliente", "red-team", "relator"]}'::jsonb, ARRAY['brainstorm', 'modo']),
  (v_ws_id, v_user_id, 'Planejamento (Plano executável)', 'Facilitador → GP → Analista Dados → Financeiro → Red Team → Relator', 'session', 'modo-reuniao', '{"agent_slugs": ["facilitador", "gp-operacoes", "analista-dados", "financeiro", "red-team", "relator"]}'::jsonb, ARRAY['planejamento', 'modo']),
  (v_ws_id, v_user_id, 'Negociação com cliente', 'Executivo Contas → Negociador → Jurídico → Financeiro → Relator', 'session', 'modo-reuniao', '{"agent_slugs": ["executivo-contas", "negociador", "juridico-compliance", "financeiro", "relator"]}'::jsonb, ARRAY['negociacao', 'modo']);

  RAISE NOTICE 'Seed: 15 agentes (prompts robustos) + 3 modos de reunião inseridos no workspace ws-default.';
END $$;
`

const inserts = AGENTS.map((a, i) => {
  const prompt = ROBUST_PROMPTS[a.slug] ?? ''
  const escaped = escapeSql(prompt)
  return `  -- ${i + 1}) ${a.name}
  INSERT INTO ai_agents (workspace_id, created_by, name, slug, description, role, system_prompt, personality_traits, behavior_settings, tags)
  VALUES (v_ws_id, v_user_id,
    '${escapeSql(a.name)}',
    '${a.slug}',
    '${escapeSql(a.description)}',
    '${escapeSql(a.role)}',
    E'${escaped}',
    '${a.personality}'::jsonb,
    v_behav,
    ${a.tags});
`
}).join('\n')

const out = header + inserts + footer
const path = join(process.cwd(), 'server', 'seed-agents.sql')
writeFileSync(path, out, 'utf8')
console.log('Gerado:', path)
