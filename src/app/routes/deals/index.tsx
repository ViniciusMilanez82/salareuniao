import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/useAuthStore'
import { fetchDeals, createDeal, updateDeal, deleteDeal } from '@/lib/api/deals'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import {
  Plus, DollarSign, TrendingUp, ArrowRight, X, Save,
  Trash2, Edit, Calendar, Percent, Handshake, HelpCircle
} from 'lucide-react'
import toast from 'react-hot-toast'
import type { Deal, DealStatus } from '@/types/database.types'
import { DEAL_STATUS } from '@/config/constants'

const DEAL_STATUS_LABELS: Record<string, string> = {
  prospecting: 'Prospecção',
  qualification: 'Qualificação',
  proposal: 'Proposta',
  negotiation: 'Negociação',
  closed_won: 'Ganho',
  closed_lost: 'Perdido',
}

const DEAL_STATUS_VARIANT: Record<string, 'info' | 'warning' | 'violet' | 'success' | 'default' | 'danger'> = {
  prospecting: 'info',
  qualification: 'warning',
  proposal: 'violet',
  negotiation: 'warning',
  closed_won: 'success',
  closed_lost: 'danger',
}

const DEAL_STATUS_OPTIONS: { value: DealStatus; label: string }[] = [
  { value: 'prospecting', label: 'Prospecção — Contato inicial' },
  { value: 'qualification', label: 'Qualificação — Avaliando interesse' },
  { value: 'proposal', label: 'Proposta — Enviada ao cliente' },
  { value: 'negotiation', label: 'Negociação — Ajustando termos' },
  { value: 'closed_won', label: 'Ganho — Negócio fechado!' },
  { value: 'closed_lost', label: 'Perdido — Não avançou' },
]

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const { workspace } = useAuthStore()

  // Form
  const [form, setForm] = useState({
    title: '',
    description: '',
    value: '',
    currency: 'BRL',
    status: 'prospecting' as DealStatus,
    probability: '50',
    expected_close_date: '',
  })

  const resetForm = () => {
    setForm({
      title: '', description: '', value: '', currency: 'BRL',
      status: 'prospecting', probability: '50', expected_close_date: '',
    })
    setEditingDeal(null)
  }

  const loadDeals = () => {
    if (!workspace?.id) return
    setLoading(true)
    fetchDeals(workspace.id)
      .then(setDeals)
      .catch(() => setDeals([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (workspace?.id) {
      loadDeals()
    } else {
      setDeals([])
      setLoading(false)
    }
  }, [workspace?.id])

  const openCreate = () => {
    resetForm()
    setShowForm(true)
  }

  const openEdit = (deal: Deal) => {
    setEditingDeal(deal)
    setForm({
      title: deal.title || '',
      description: deal.description || '',
      value: deal.value != null ? String(deal.value) : '',
      currency: deal.currency || 'BRL',
      status: deal.status || 'prospecting',
      probability: String(deal.probability ?? 50),
      expected_close_date: deal.expected_close_date?.split('T')[0] || '',
    })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error('O título do negócio é obrigatório')
      return
    }
    if (!workspace?.id) return
    setSaving(true)
    try {
      const payload = {
        workspace_id: workspace.id,
        title: form.title,
        description: form.description || undefined,
        value: form.value ? Number(form.value) : undefined,
        currency: form.currency,
        status: form.status,
        probability: Number(form.probability) || 50,
        expected_close_date: form.expected_close_date || undefined,
      }
      if (editingDeal) {
        await updateDeal(editingDeal.id, payload)
        toast.success('Negócio atualizado!')
      } else {
        await createDeal(payload)
        toast.success('Negócio criado com sucesso!')
      }
      setShowForm(false)
      resetForm()
      loadDeals()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este negócio?')) return
    setDeleting(id)
    try {
      await deleteDeal(id)
      toast.success('Negócio removido')
      loadDeals()
    } catch {
      toast.error('Erro ao remover')
    } finally {
      setDeleting(null)
    }
  }

  const activeDeals = deals.filter((d) => !['closed_won', 'closed_lost'].includes(d.status))
  const pipelineTotal = activeDeals.reduce((acc, d) => acc + (Number(d.value) || 0), 0)
  const weightedValue = activeDeals.reduce(
    (acc, d) => acc + ((Number(d.value) || 0) * ((d.probability || 0) / 100)),
    0
  )
  const closedWon = deals.filter((d) => d.status === 'closed_won').length
  const conversionRate = deals.length > 0 ? Math.round((closedWon / deals.length) * 100) : 0

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h2 flex items-center gap-2">
            <Handshake className="w-7 h-7 text-primary-500" />
            Negócios
          </h1>
          <p className="text-body text-gray-500 mt-1">
            {loading ? 'Carregando...' : `${activeDeals.length} oportunidade(s) ativa(s)`}
          </p>
        </div>
        <Button onClick={openCreate} icon={<Plus className="w-4 h-4" />}>
          Novo Negócio
        </Button>
      </div>

      {/* Dica para leigos */}
      {!loading && deals.length === 0 && !showForm && (
        <Card className="bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center shrink-0">
              <DollarSign className="w-6 h-6 text-primary-500" />
            </div>
            <div>
              <h3 className="text-body font-semibold">Acompanhe seus negócios</h3>
              <p className="text-body-sm text-gray-600 dark:text-gray-400 mt-1">
                Aqui você organiza suas oportunidades de venda desde o primeiro contato até o fechamento. 
                Acompanhe o valor, a probabilidade de ganho e o estágio de cada negociação.
              </p>
              <Button className="mt-3" size="sm" onClick={openCreate} icon={<Plus className="w-4 h-4" />}>
                Adicionar primeiro negócio
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* KPIs */}
      {deals.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-primary-500" />
              </div>
              <div>
                <p className="text-body-xs text-gray-500">Pipeline Total</p>
                <p className="text-h4">{loading ? '-' : formatCurrency(pipelineTotal)}</p>
                <p className="text-body-xs text-gray-400">Soma de todos os negócios ativos</p>
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
                <p className="text-h4">{loading ? '-' : formatCurrency(weightedValue)}</p>
                <p className="text-body-xs text-gray-400">Valor × probabilidade de ganho</p>
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
                <p className="text-h4">{loading ? '-' : `${conversionRate}%`}</p>
                <p className="text-body-xs text-gray-400">% de negócios ganhos</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <Card className="w-full max-w-lg relative">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-h3 font-semibold">
                  {editingDeal ? 'Editar Negócio' : 'Novo Negócio'}
                </h2>
                <p className="text-body-xs text-gray-500 mt-1">
                  {editingDeal
                    ? 'Atualize as informações do negócio'
                    : 'Registre uma nova oportunidade de venda'}
                </p>
              </div>
              <button onClick={() => { setShowForm(false); resetForm() }} className="btn-icon">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <Input
                label="Título *"
                placeholder="Ex: Implantação do software na Empresa X"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                autoFocus
              />
              <div>
                <label className="label">Descrição</label>
                <textarea
                  className="input-field min-h-[80px] resize-vertical"
                  placeholder="Detalhes da oportunidade (opcional)"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Valor (R$)"
                  type="number"
                  placeholder="10000"
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                />
                <div>
                  <label className="label flex items-center gap-1">
                    Probabilidade de ganho
                    <span className="text-primary-500 font-semibold">{form.probability}%</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={form.probability}
                    onChange={(e) => setForm({ ...form, probability: e.target.value })}
                    className="w-full accent-primary-500 mt-2"
                  />
                  <p className="text-body-xs text-gray-400 mt-1">
                    Quão provável é fechar este negócio?
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Estágio</label>
                  <select
                    className="input-field"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as DealStatus })}
                  >
                    {DEAL_STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <Input
                  label="Previsão de fechamento"
                  type="date"
                  value={form.expected_close_date}
                  onChange={(e) => setForm({ ...form, expected_close_date: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
              <Button variant="ghost" onClick={() => { setShowForm(false); resetForm() }}>
                Cancelar
              </Button>
              <Button
                icon={<Save className="w-4 h-4" />}
                loading={saving}
                onClick={handleSave}
              >
                {editingDeal ? 'Atualizar' : 'Criar Negócio'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Deal List */}
      {loading ? (
        <div className="text-center py-16 text-gray-500">Carregando negócios...</div>
      ) : deals.length > 0 && (
        <Card>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {deals.map((d) => (
              <div key={d.id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0 px-4 -mx-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/30 group">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-body-sm font-medium truncate">{d.title}</p>
                    <Badge variant={DEAL_STATUS_VARIANT[d.status] || 'default'}>
                      {DEAL_STATUS_LABELS[d.status] || d.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-body-xs text-gray-500">
                    {d.probability != null && (
                      <span className="flex items-center gap-1">
                        <Percent className="w-3 h-3" /> {d.probability}% chance
                      </span>
                    )}
                    {d.expected_close_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(d.expected_close_date).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-body-sm font-semibold">
                  {d.value != null ? formatCurrency(Number(d.value)) : '-'}
                </span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(d)} className="btn-icon w-8 h-8" title="Editar negócio">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(d.id)}
                    className="btn-icon w-8 h-8 text-red-500"
                    title="Remover negócio"
                    disabled={deleting === d.id}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
