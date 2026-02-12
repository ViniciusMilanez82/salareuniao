import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/useAuthStore'
import { fetchMeetings } from '@/lib/api/meetings'
import { fetchAgents } from '@/lib/api/agents'
import { Card, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { BarChart3, Clock, Bot, Zap } from 'lucide-react'

export default function AnalyticsPage() {
  const { workspace } = useAuthStore()
  const [meetings, setMeetings] = useState<{ duration_minutes: number | null; status: string }[]>([])
  const [agents, setAgents] = useState<{ usage_count?: number; average_rating?: number }[]>([])
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

  const totalSessions = meetings.length
  const totalMinutes = meetings.reduce((a, m) => a + (m.duration_minutes || 0), 0)
  const totalHours = Math.round(totalMinutes / 60 * 10) / 10

  const stats = [
    { label: 'Total de Sessões', value: String(totalSessions), icon: BarChart3, color: 'text-primary-500 bg-primary-100 dark:bg-primary-900/30' },
    { label: 'Horas de Debate', value: `${totalHours}h`, icon: Clock, color: 'text-accent-500 bg-accent-100 dark:bg-accent-900/30' },
    { label: 'Agentes Ativos', value: String(agents.length), icon: Bot, color: 'text-violet-500 bg-violet-100 dark:bg-violet-900/30' },
    { label: 'Agentes (total)', value: String(agents.length), icon: Zap, color: 'text-secondary-500 bg-secondary-100 dark:bg-secondary-900/30' },
  ]

  const topAgents = [...agents]
    .sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0))
    .slice(0, 4) as { name?: string; usage_count?: number; average_rating?: number }[]

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-h2">Analytics</h1>
      <p className="text-body text-gray-500">Métricas e insights do workspace</p>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-8 text-gray-500">Carregando...</div>
        ) : (
          stats.map((stat) => (
          <Card key={stat.label}>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sessions Chart Placeholder */}
        <Card>
          <CardTitle>Sessões por Semana</CardTitle>
          <div className="mt-4 h-64 flex items-end gap-2">
            {totalSessions === 0 ? (
              <div className="w-full text-center py-16 text-gray-500">Sem dados de sessões</div>
            ) : (
            [...Array(12)].map((_, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-primary-500/80 rounded-t-md transition-all hover:bg-primary-500"
                  style={{ height: '10%' }}
                />
                <span className="text-body-xs text-gray-500">S{i + 1}</span>
              </div>
            ))
            )}
          </div>
        </Card>

        {/* Sentiment Distribution */}
        <Card>
          <CardTitle>Distribuição de Sentimento</CardTitle>
          <div className="mt-4 space-y-4">
            {totalSessions === 0 ? (
              <p className="text-body-sm text-gray-500 py-4">Sem dados de sentimento</p>
            ) : (
            [
              { label: 'Positivo', pct: 0, color: 'bg-secondary-500' },
              { label: 'Neutro', pct: 0, color: 'bg-gray-400' },
              { label: 'Negativo', pct: 0, color: 'bg-red-500' },
            ].map((s) => (
              <div key={s.label}>
                <div className="flex justify-between mb-1">
                  <span className="text-body-sm">{s.label}</span>
                  <span className="text-body-sm font-semibold">{s.pct}%</span>
                </div>
                <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className={`${s.color} h-2 rounded-full transition-all`} style={{ width: `${s.pct}%` }} />
                </div>
              </div>
            ))
            )}
          </div>
        </Card>

        {/* Top Topics */}
        <Card>
          <CardTitle>Tópicos Mais Discutidos</CardTitle>
          <div className="mt-4 flex flex-wrap gap-2">
            {totalSessions === 0 ? (
              <p className="text-body-sm text-gray-500 py-4">Sem dados de tópicos</p>
            ) : (
              <p className="text-body-sm text-gray-500 py-4">Dados de tópicos em breve</p>
            )}
          </div>
        </Card>

        {/* Agent Performance */}
        <Card>
          <CardTitle>Performance dos Agentes</CardTitle>
          <div className="mt-4 space-y-3">
            {topAgents.length === 0 ? (
              <p className="text-body-sm text-gray-500 py-4">Nenhum agente com dados de uso</p>
            ) : (
            topAgents.map((a, i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-body-sm font-medium">{a.name ?? 'Agente'}</p>
                  <p className="text-body-xs text-gray-500">{a.usage_count ?? 0} sessões</p>
                </div>
                <div className="text-right">
                  <p className="text-body-sm font-semibold text-secondary-500">{(a.average_rating ?? 0) * 20}%</p>
                  <p className="text-body-xs text-gray-500">rating</p>
                </div>
              </div>
            ))
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
