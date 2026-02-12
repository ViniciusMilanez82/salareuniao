import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { DEAL_STATUS } from '@/config/constants'
import type { DealStatus } from '@/types/database.types'
import { Plus, DollarSign, TrendingUp, ArrowRight } from 'lucide-react'

const mockDeals: Array<{
  id: string; title: string; value: number; status: DealStatus
  probability: number; company: string; expected_close: string
}> = [
  { id: '1', title: 'Contrato Enterprise TechCorp', value: 120000, status: 'negotiation', probability: 75, company: 'TechCorp', expected_close: '2026-03-15' },
  { id: '2', title: 'Licença InnovTech Anual', value: 48000, status: 'proposal', probability: 50, company: 'InnovTech', expected_close: '2026-04-01' },
  { id: '3', title: 'Piloto BigData AI', value: 25000, status: 'qualification', probability: 30, company: 'BigData AI', expected_close: '2026-05-10' },
  { id: '4', title: 'Expansão LegalX', value: 85000, status: 'closed_won', probability: 100, company: 'LegalX', expected_close: '2026-02-01' },
]

export default function DealsPage() {
  const statusVariant: Record<DealStatus, 'default' | 'info' | 'warning' | 'success' | 'danger'> = {
    prospecting: 'default',
    qualification: 'info',
    proposal: 'warning',
    negotiation: 'warning',
    closed_won: 'success',
    closed_lost: 'danger',
  }

  const totalValue = mockDeals.reduce((sum, d) => sum + d.value, 0)
  const weightedValue = mockDeals.reduce((sum, d) => sum + (d.value * d.probability / 100), 0)

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h2">Negócios</h1>
          <p className="text-body text-gray-500 mt-1">{mockDeals.length} oportunidades ativas</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />}>Novo Negócio</Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-primary-500" />
            </div>
            <div>
              <p className="text-body-xs text-gray-500">Pipeline Total</p>
              <p className="text-h4">R$ {totalValue.toLocaleString('pt-BR')}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-secondary-100 dark:bg-secondary-900/30 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-secondary-500" />
            </div>
            <div>
              <p className="text-body-xs text-gray-500">Valor Ponderado</p>
              <p className="text-h4">R$ {weightedValue.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center">
              <ArrowRight className="w-5 h-5 text-accent-500" />
            </div>
            <div>
              <p className="text-body-xs text-gray-500">Taxa de Conversão</p>
              <p className="text-h4">25%</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Pipeline view */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {(['qualification', 'proposal', 'negotiation', 'closed_won'] as DealStatus[]).map((status) => {
          const deals = mockDeals.filter((d) => d.status === status)
          return (
            <div key={status}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-body-sm font-semibold">{DEAL_STATUS[status].label}</h3>
                <Badge variant={statusVariant[status]}>{deals.length}</Badge>
              </div>
              <div className="space-y-3">
                {deals.map((deal) => (
                  <Card key={deal.id} interactive className="!p-4">
                    <h4 className="text-body-sm font-medium">{deal.title}</h4>
                    <p className="text-body-xs text-gray-500 mt-1">{deal.company}</p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-body-sm font-semibold text-primary-500">
                        R$ {deal.value.toLocaleString('pt-BR')}
                      </span>
                      <span className="text-body-xs text-gray-500">{deal.probability}%</span>
                    </div>
                    <div className="mt-2 bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                      <div className="bg-primary-500 h-1 rounded-full" style={{ width: `${deal.probability}%` }} />
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
