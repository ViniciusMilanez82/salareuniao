import { Card, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { BarChart3, TrendingUp, Clock, Bot, Users, Zap } from 'lucide-react'

export default function AnalyticsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-h2">Analytics</h1>
      <p className="text-body text-gray-500">Métricas e insights do workspace</p>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total de Sessões', value: '47', change: '+18%', icon: BarChart3, color: 'text-primary-500 bg-primary-100 dark:bg-primary-900/30' },
          { label: 'Horas de Debate', value: '32h', change: '+12%', icon: Clock, color: 'text-accent-500 bg-accent-100 dark:bg-accent-900/30' },
          { label: 'Agentes Ativos', value: '12', change: '+4', icon: Bot, color: 'text-violet-500 bg-violet-100 dark:bg-violet-900/30' },
          { label: 'Insights Gerados', value: '156', change: '+34%', icon: Zap, color: 'text-secondary-500 bg-secondary-100 dark:bg-secondary-900/30' },
        ].map((stat) => (
          <Card key={stat.label}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-body-sm text-gray-500">{stat.label}</p>
                <p className="text-h2 mt-1">{stat.value}</p>
                <p className="text-body-xs text-secondary-500 mt-1">{stat.change} este mês</p>
              </div>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sessions Chart Placeholder */}
        <Card>
          <CardTitle>Sessões por Semana</CardTitle>
          <div className="mt-4 h-64 flex items-end gap-2">
            {[4, 7, 3, 8, 6, 9, 5, 11, 7, 8, 12, 9].map((val, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-primary-500/80 rounded-t-md transition-all hover:bg-primary-500"
                  style={{ height: `${(val / 12) * 100}%` }}
                />
                <span className="text-body-xs text-gray-500">S{i + 1}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Sentiment Distribution */}
        <Card>
          <CardTitle>Distribuição de Sentimento</CardTitle>
          <div className="mt-4 space-y-4">
            {[
              { label: 'Positivo', pct: 58, color: 'bg-secondary-500' },
              { label: 'Neutro', pct: 30, color: 'bg-gray-400' },
              { label: 'Negativo', pct: 12, color: 'bg-red-500' },
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
            ))}
          </div>
        </Card>

        {/* Top Topics */}
        <Card>
          <CardTitle>Tópicos Mais Discutidos</CardTitle>
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              { topic: 'Estratégia', count: 23 },
              { topic: 'Finanças', count: 18 },
              { topic: 'Marketing', count: 15 },
              { topic: 'Produto', count: 14 },
              { topic: 'Regulamentação', count: 11 },
              { topic: 'Tecnologia', count: 10 },
              { topic: 'RH', count: 8 },
              { topic: 'Vendas', count: 7 },
            ].map((t) => (
              <div key={t.topic} className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 rounded-full px-3 py-1.5">
                <span className="text-body-sm font-medium">{t.topic}</span>
                <Badge variant="info">{t.count}</Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* Agent Performance */}
        <Card>
          <CardTitle>Performance dos Agentes</CardTitle>
          <div className="mt-4 space-y-3">
            {[
              { name: 'Analista Financeiro', sessions: 34, avgDuration: '42min', satisfaction: 96 },
              { name: 'Estrategista de Marketing', sessions: 28, avgDuration: '38min', satisfaction: 92 },
              { name: 'Advogado Cético', sessions: 22, avgDuration: '45min', satisfaction: 94 },
              { name: 'Especialista em Dados', sessions: 19, avgDuration: '35min', satisfaction: 90 },
            ].map((a) => (
              <div key={a.name} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-body-sm font-medium">{a.name}</p>
                  <p className="text-body-xs text-gray-500">{a.sessions} sessões &middot; Média {a.avgDuration}</p>
                </div>
                <div className="text-right">
                  <p className="text-body-sm font-semibold text-secondary-500">{a.satisfaction}%</p>
                  <p className="text-body-xs text-gray-500">satisfação</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
