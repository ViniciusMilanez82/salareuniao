export const APP_NAME = 'Sala de Reunião'
export const APP_DESCRIPTION = 'Plataforma de Simulação Cognitiva e Colaboração Aumentada'

export const MEETING_TYPES = {
  debate: { label: 'Debate', icon: 'MessageSquare', color: 'primary' },
  brainstorm: { label: 'Brainstorm', icon: 'Lightbulb', color: 'accent' },
  analysis: { label: 'Análise', icon: 'BarChart3', color: 'violet' },
  strategy: { label: 'Estratégia', icon: 'Target', color: 'secondary' },
  review: { label: 'Revisão', icon: 'ClipboardCheck', color: 'primary' },
  negotiation: { label: 'Negociação', icon: 'Handshake', color: 'accent' },
  custom: { label: 'Personalizado', icon: 'Settings', color: 'gray' },
} as const

export const MEETING_STATUS = {
  draft: { label: 'Rascunho', color: 'gray' },
  scheduled: { label: 'Agendada', color: 'blue' },
  lobby: { label: 'No Lobby', color: 'yellow' },
  in_progress: { label: 'Em Andamento', color: 'green' },
  paused: { label: 'Pausada', color: 'orange' },
  completed: { label: 'Concluída', color: 'emerald' },
  cancelled: { label: 'Cancelada', color: 'red' },
  archived: { label: 'Arquivada', color: 'gray' },
} as const

export const USER_ROLES = {
  workspace_admin: { label: 'Administrador', description: 'Controle total do workspace' },
  moderator: { label: 'Moderador', description: 'Controle de sessões' },
  agent_creator: { label: 'Criador de Agentes', description: 'Cria e gerencia agentes' },
  observer: { label: 'Observador', description: 'Apenas visualização' },
  analyst: { label: 'Analista', description: 'Acesso a dados e relatórios' },
  integrator: { label: 'Integrador/TI', description: 'API e integrações' },
} as const

export const DEAL_STATUS = {
  prospecting: { label: 'Prospecção', color: 'gray' },
  qualification: { label: 'Qualificação', color: 'blue' },
  proposal: { label: 'Proposta', color: 'yellow' },
  negotiation: { label: 'Negociação', color: 'orange' },
  closed_won: { label: 'Fechado (Ganho)', color: 'green' },
  closed_lost: { label: 'Fechado (Perdido)', color: 'red' },
} as const

export const PERSONALITY_TRAITS = [
  { key: 'professionalism', label: 'Profissionalismo', min: 1, max: 10 },
  { key: 'creativity', label: 'Criatividade', min: 1, max: 10 },
  { key: 'detail_orientation', label: 'Atenção a Detalhes', min: 1, max: 10 },
  { key: 'assertiveness', label: 'Assertividade', min: 1, max: 10 },
  { key: 'empathy', label: 'Empatia', min: 1, max: 10 },
  { key: 'humor', label: 'Humor', min: 1, max: 10 },
] as const

export const MAX_AGENTS_PER_SESSION = 8
