import { useState, useEffect } from 'react'
import { Card, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { useAuthStore } from '@/stores/useAuthStore'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/config/routes'
import { fetchMeetings } from '@/lib/api/meetings'
import { fetchAgents } from '@/lib/api/agents'
import {
  Calendar, Bot, TrendingUp, Clock, Plus, ArrowRight,
  MessageSquare, Zap, BarChart3
} from 'lucide-react'

export default function DashboardPage() {
  const { user, workspace } = useAuthStore()
  const navigate = useNavigate()
  const [meetings, setMeetings] = useState<{ id: string; title: string; status: string; meeting_type: string; duration_minutes: number | null; scheduled_start: string | null; agent_count?: number }[]>([])
  const [agents, setAgents] = useState<{ id: string; name: string; role: string; usage_count?: number; average_rating?: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!workspace?.id) {
      setLoading(false)
      return
    }
    Promise.all([
      fetchMeetings(workspace.id).then(setMeetings).catch(() => setMeetings([])),
      fetchAgents(workspace.id).then(setAgents).catch(() => setAgents([])),
    ]).finally(() => setLoading(false))
  }, [workspace?.id])

  const activeSessions = meetings.filter((m) => m.status === 'in_progress').length
  const completedMeetings = meetings.filter((m) => m.status === 'completed')
  const avgDuration = completedMeetings.length > 0
    ? Math.round(completedMeetings.reduce((a, m) => a + (m.duration_minutes || 0), 0) / completedMeetings.length)
    : 0

  const stats = [
    { label: 'Sessões Ativas', value: String(activeSessions), icon: Calendar, color: 'text-primary-500 bg-primary-100 dark:bg-primary-900/30' },
    { label: 'Agentes Criados', value: String(agents.length), icon: Bot, color: 'text-violet-500 bg-violet-100 dark:bg-violet-900/30' },
    { label: 'Tempo Médio de Debate', value: avgDuration ? `${avgDuration}min` : '—', icon: Clock, color: 'text-accent-500 bg-accent-100 dark:bg-accent-900/30' },
    { label: 'Sessões Totais', value: String(meetings.length), icon: TrendingUp, color: 'text-secondary-500 bg-secondary-100 dark:bg-secondary-900/30' },
  ]

  const recentSessions = meetings.slice(0, 5).map((m) => ({
    id: m.id,
    title: m.title,
    status: m.status,
    agents: m.agent_count ?? 0,
    duration: m.duration_minutes ? `${m.duration_minutes}min` : '—',
    date: m.scheduled_start ? new Date(m.scheduled_start).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—',
  }))

  const topAgents = [...agents]
    .sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0))
    .slice(0, 4)

  const getStatusBadge = (status: string) => {
    const map: Record<string, { variant: 'success' | 'warning' | 'info' | 'default'; label: string }> = {
      completed: { variant: 'success', label: 'Concluída' },
      in_progress: { variant: 'warning', label: 'Em Andamento' },
      scheduled: { variant: 'info', label: 'Agendada' },
    }
    const s = map[status] || { variant: 'default' as const, label: status }
    return <Badge variant={s.variant}>{s.label}</Badge>
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h2">
            Bem-vindo, {user?.name?.split(' ')[0] || 'Usuário'}
          </h1>
          <p className="text-body text-gray-500 mt-1">
            Aqui está o resumo do seu workspace hoje
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => navigate(ROUTES.AGENTS)} icon={<Bot className="w-4 h-4" />}>
            Novo Agente
          </Button>
          <Button onClick={() => navigate(ROUTES.MEETING_CREATE)} icon={<Plus className="w-4 h-4" />}>
            Nova Sessão
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-8 text-gray-500">Carregando...</div>
        ) : (
          stats.map((stat) => (
            <Card key={stat.label} interactive>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-body-sm text-gray-500">{stat.label}</p>
                  <p className="text-h2 mt-1">{stat.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Sessions */}
        <div className="lg:col-span-2">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <CardTitle>Sessões Recentes</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate(ROUTES.MEETINGS)}>
                Ver todas <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
            <CardContent>
              <div className="space-y-3">
                {recentSessions.length === 0 ? (
                  <p className="text-body-sm text-gray-500 py-4">Nenhuma sessão recente</p>
                ) : (
                  recentSessions.map((session) => (
                    <div
                      key={session.id}
                      onClick={() => navigate(ROUTES.MEETINGS)}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                          <MessageSquare className="w-5 h-5 text-primary-500" />
                        </div>
                        <div>
                          <p className="text-body-sm font-medium">{session.title}</p>
                          <p className="text-body-xs text-gray-500">
                            {session.agents} agentes &middot; {session.duration} &middot; {session.date}
                          </p>
                        </div>
                      </div>
                      {getStatusBadge(session.status)}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Agents */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <CardTitle>Agentes Mais Usados</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate(ROUTES.AGENTS)}>
              Ver todos
            </Button>
          </div>
          <CardContent>
            <div className="space-y-3">
              {topAgents.length === 0 ? (
                <p className="text-body-sm text-gray-500 py-4">Nenhum agente ainda</p>
              ) : (
                topAgents.map((agent, idx) => (
                  <div key={agent.id} className="flex items-center gap-3">
                    <span className="text-body-xs text-gray-400 w-4">{idx + 1}</span>
                    <Avatar name={agent.name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-body-sm font-medium truncate">{agent.name}</p>
                      <p className="text-body-xs text-gray-500">{agent.role}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-body-xs font-medium">{agent.usage_count ?? 0}x</p>
                      <p className="text-body-xs text-accent-500">&#9733; {agent.average_rating ?? '-'}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card interactive onClick={() => navigate(ROUTES.MEETING_CREATE)}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <Zap className="w-6 h-6 text-primary-500" />
            </div>
            <div>
              <p className="font-medium">Sessão Rápida</p>
              <p className="text-body-sm text-gray-500">Iniciar debate em segundos</p>
            </div>
          </div>
        </Card>
        <Card interactive onClick={() => navigate(ROUTES.AGENT_CREATE)}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
              <Bot className="w-6 h-6 text-violet-500" />
            </div>
            <div>
              <p className="font-medium">Criar Agente</p>
              <p className="text-body-sm text-gray-500">Personalize um novo agente IA</p>
            </div>
          </div>
        </Card>
        <Card interactive onClick={() => navigate(ROUTES.DASHBOARD_ANALYTICS)}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-secondary-100 dark:bg-secondary-900/30 flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-secondary-500" />
            </div>
            <div>
              <p className="font-medium">Ver Analytics</p>
              <p className="text-body-sm text-gray-500">Insights e métricas</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
