import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Plus, DollarSign, TrendingUp, ArrowRight } from 'lucide-react'

export default function DealsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h2">Negócios</h1>
          <p className="text-body text-gray-500 mt-1">0 oportunidades ativas</p>
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
              <p className="text-h4">R$ 0</p>
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
              <p className="text-h4">R$ 0</p>
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
              <p className="text-h4">0%</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="text-center py-16 text-gray-500">
        Nenhum negócio encontrado. API de negócios ainda não disponível.
      </div>
    </div>
  )
}
