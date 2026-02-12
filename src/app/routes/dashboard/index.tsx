import { Card, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { useAuthStore } from '@/stores/useAuthStore'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/config/routes'
import {
  Calendar, Bot, TrendingUp, Clock, Plus, ArrowRight,
  MessageSquare, Zap, BarChart3, Activity
} from 'lucide-react'

const mockStats = [
  { label: 'Sessões Ativas', value: '3', change: '+12%', icon: Calendar, color: 'text-primary-500 bg-primary-100 dark:bg-primary-900/30' },
  { label: 'Agentes Criados', value: '12', change: '+4', icon: Bot, color: 'text-violet-500 bg-violet-100 dark:bg-violet-900/30' },
  { label: 'Tempo Médio de Debate', value: '42min', change: '-8%', icon: Clock, color: 'text-accent-500 bg-accent-100 dark:bg-accent-900/30' },
  { label: 'Insights Gerados', value: '89', change: '+23%', icon: TrendingUp, color: 'text-secondary-500 bg-secondary-100 dark:bg-secondary-900/30' },
]

const mockRecentSessions = [
  { id: '1', title: 'Análise de Mercado LATAM', type: 'analysis', status: 'completed', agents: 4, duration: '38min', date: '2h atrás' },
  { id: '2', title: 'Brainstorm Produto Q2', type: 'brainstorm', status: 'in_progress', agents: 6, duration: '25min', date: 'Agora' },
  { id: '3', title: 'Revisão Estratégica Anual', type: 'strategy', status: 'scheduled', agents: 8, duration: '—', date: 'Em 3h' },
  { id: '4', title: 'Debate Ética em IA', type: 'debate', status: 'completed', agents: 5, duration: '52min', date: 'Ontem' },
]

const mockTopAgents = [
  { name: 'Analista Financeiro', role: 'Finanças', uses: 34, rating: 4.8 },
  { name: 'Estrategista de Marketing', role: 'Marketing', uses: 28, rating: 4.6 },
  { name: 'Advogado Cético', role: 'Jurídico', uses: 22, rating: 4.7 },
  { name: 'Especialista em Dados', role: 'Data Science', uses: 19, rating: 4.5 },
]

export default function DashboardPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()

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
        {mockStats.map((stat) => (
          <Card key={stat.label} interactive>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-body-sm text-gray-500">{stat.label}</p>
                <p className="text-h2 mt-1">{stat.value}</p>
                <p className="text-body-xs text-secondary-500 mt-1">{stat.change} vs. mês anterior</p>
              </div>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
          </Card>
        ))}
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
                {mockRecentSessions.map((session) => (
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
                ))}
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
              {mockTopAgents.map((agent, idx) => (
                <div key={agent.name} className="flex items-center gap-3">
                  <span className="text-body-xs text-gray-400 w-4">{idx + 1}</span>
                  <Avatar name={agent.name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-body-sm font-medium truncate">{agent.name}</p>
                    <p className="text-body-xs text-gray-500">{agent.role}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-body-xs font-medium">{agent.uses}x</p>
                    <p className="text-body-xs text-accent-500">&#9733; {agent.rating}</p>
                  </div>
                </div>
              ))}
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
