import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/useAuthStore'
import { fetchMeetings } from '@/lib/api/meetings'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { ROUTES } from '@/config/routes'
import { MEETING_STATUS, MEETING_TYPES } from '@/config/constants'
import type { MeetingStatus, MeetingType } from '@/types/database.types'
import {
  Plus, Search, Calendar, Clock, Bot,
  Play, MoreVertical, ArrowRight
} from 'lucide-react'

type SessionRow = {
  id: string
  title: string
  meeting_type: MeetingType
  status: MeetingStatus
  agent_count?: number
  scheduled_start: string | null
  duration_minutes: number | null
  tags: string[]
}

export default function SessionsListPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [loading, setLoading] = useState(true)
  const { workspace } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (!workspace?.id) {
      setLoading(false)
      return
    }
    fetchMeetings(workspace.id, statusFilter === 'all' ? undefined : statusFilter)
      .then((data) => setSessions((data as SessionRow[]) || []))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false))
  }, [workspace?.id, statusFilter])

  const filtered = sessions.filter((s) =>
    s.title?.toLowerCase().includes(search.toLowerCase())
  )

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
        {loading ? (
          <div className="text-center py-12 text-gray-500">Carregando sessões...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Nenhuma sessão encontrada.{' '}
            <button onClick={() => navigate(ROUTES.MEETING_CREATE)} className="text-primary-500 font-medium hover:underline">
              Criar primeira sessão
            </button>
          </div>
        ) : filtered.map((session) => (
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
                      <Bot className="w-3 h-3" /> {session.agent_count ?? 0} agentes
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                {session.status === 'in_progress' && (
                  <Button size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/meetings/${session.id}/room`); }}>
                    Entrar <ArrowRight className="w-3 h-3" />
                  </Button>
                )}
                <button className="btn-icon w-8 h-8 ml-1" onClick={(e) => e.stopPropagation()}>
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>
            {(session.tags?.length ?? 0) > 0 && (
              <div className="flex gap-1.5 mt-3 pt-3 border-t">
                {(session.tags ?? []).map((tag) => (
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
