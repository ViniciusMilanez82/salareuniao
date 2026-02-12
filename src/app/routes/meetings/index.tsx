import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { ROUTES } from '@/config/routes'
import { MEETING_STATUS, MEETING_TYPES } from '@/config/constants'
import type { MeetingStatus, MeetingType } from '@/types/database.types'
import {
  Plus, Search, Filter, Calendar, Clock, Bot,
  Play, MoreVertical, ArrowRight
} from 'lucide-react'

const mockSessions = [
  { id: '1', title: 'Análise de Impacto da Fusão ABC', meeting_type: 'analysis' as MeetingType, status: 'completed' as MeetingStatus, agents: ['Analista Financeiro', 'Advogado Cético', 'Estrategista', 'RH'], scheduled_start: '2026-02-11T14:00:00', duration_minutes: 45, tags: ['fusão', 'M&A'] },
  { id: '2', title: 'Brainstorm de Produto Q2 2026', meeting_type: 'brainstorm' as MeetingType, status: 'in_progress' as MeetingStatus, agents: ['PM', 'Designer UX', 'Dev Lead', 'Marketing', 'Data', 'Suporte'], scheduled_start: '2026-02-12T10:00:00', duration_minutes: null, tags: ['produto', 'Q2'] },
  { id: '3', title: 'Revisão Estratégica Anual', meeting_type: 'strategy' as MeetingType, status: 'scheduled' as MeetingStatus, agents: ['CEO', 'CFO', 'COO', 'CMO', 'CTO', 'CHRO', 'CLO', 'CSO'], scheduled_start: '2026-02-12T15:00:00', duration_minutes: null, tags: ['estratégia', '2026'] },
  { id: '4', title: 'Debate sobre Ética em IA Generativa', meeting_type: 'debate' as MeetingType, status: 'completed' as MeetingStatus, agents: ['Filósofo', 'Engenheiro IA', 'Jurista', 'Sociólogo', 'Ativista'], scheduled_start: '2026-02-10T09:00:00', duration_minutes: 52, tags: ['ética', 'IA'] },
  { id: '5', title: 'Negociação Contrato Enterprise', meeting_type: 'negotiation' as MeetingType, status: 'draft' as MeetingStatus, agents: ['Vendedor', 'Jurista'], scheduled_start: null, duration_minutes: null, tags: ['vendas', 'enterprise'] },
]

export default function SessionsListPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const navigate = useNavigate()

  const filtered = mockSessions.filter((s) => {
    const matchesSearch = s.title.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status: MeetingStatus) => {
    const config = MEETING_STATUS[status]
    const variantMap: Record<string, 'success' | 'warning' | 'info' | 'danger' | 'default'> = {
      completed: 'success', in_progress: 'warning', scheduled: 'info', cancelled: 'danger',
      draft: 'default', lobby: 'info', paused: 'warning', archived: 'default',
    }
    return <Badge variant={variantMap[status] || 'default'}>{config.label}</Badge>
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h2">Sessões</h1>
          <p className="text-body text-gray-500 mt-1">Gerencie suas reuniões simuladas</p>
        </div>
        <Button onClick={() => navigate(ROUTES.MEETING_CREATE)} icon={<Plus className="w-4 h-4" />}>
          Nova Sessão
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar sessões..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10"
          />
        </div>
        <div className="flex gap-1 bg-gray-100 dark:bg-surface-dark rounded-lg p-1">
          {['all', 'in_progress', 'scheduled', 'completed', 'draft'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-md text-body-xs font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-white dark:bg-surface-dark-alt shadow text-gray-900 dark:text-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {status === 'all' ? 'Todas' : MEETING_STATUS[status as MeetingStatus]?.label || status}
            </button>
          ))}
        </div>
      </div>

      {/* Sessions List */}
      <div className="space-y-3">
        {filtered.map((session) => (
          <Card
            key={session.id}
            interactive
            onClick={() => navigate(`/meetings/${session.id}/room`)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                  session.status === 'in_progress' ? 'bg-accent-100 dark:bg-accent-900/30' : 'bg-primary-100 dark:bg-primary-900/30'
                }`}>
                  {session.status === 'in_progress' ? (
                    <Play className="w-6 h-6 text-accent-500" />
                  ) : (
                    <Calendar className="w-6 h-6 text-primary-500" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-body font-semibold truncate">{session.title}</h3>
                    {getStatusBadge(session.status)}
                    <Badge variant="violet">{MEETING_TYPES[session.meeting_type]?.label}</Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-body-xs text-gray-500">
                    {session.scheduled_start && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(session.scheduled_start).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                    {session.duration_minutes && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {session.duration_minutes}min
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Bot className="w-3 h-3" /> {session.agents.length} agentes
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <div className="flex -space-x-2">
                  {session.agents.slice(0, 4).map((agent) => (
                    <Avatar key={agent} name={agent} size="xs" />
                  ))}
                  {session.agents.length > 4 && (
                    <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-body-xs font-medium ring-2 ring-white dark:ring-gray-800">
                      +{session.agents.length - 4}
                    </div>
                  )}
                </div>
                {session.status === 'in_progress' && (
                  <Button size="sm" className="ml-2" onClick={(e) => { e.stopPropagation(); navigate(`/meetings/${session.id}/room`); }}>
                    Entrar <ArrowRight className="w-3 h-3" />
                  </Button>
                )}
                <button className="btn-icon w-8 h-8 ml-1" onClick={(e) => e.stopPropagation()}>
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>
            {session.tags.length > 0 && (
              <div className="flex gap-1.5 mt-3 pt-3 border-t">
                {session.tags.map((tag) => (
                  <Badge key={tag}>{tag}</Badge>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
