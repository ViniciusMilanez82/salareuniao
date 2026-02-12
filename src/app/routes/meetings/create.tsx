import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/stores/useAuthStore'
import { createMeeting, startMeeting } from '@/lib/api/meetings'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { ROUTES } from '@/config/routes'
import { MEETING_TYPES, MAX_AGENTS_PER_SESSION } from '@/config/constants'
import {
  ArrowLeft, ArrowRight, Play, Bot, X, Plus,
  MessageSquare, Lightbulb, BarChart3, Target, ClipboardCheck, Handshake, Settings
} from 'lucide-react'

const iconMap: Record<string, React.ElementType> = {
  MessageSquare, Lightbulb, BarChart3, Target, ClipboardCheck, Handshake, Settings,
}

const availableAgents = [
  { id: '1', name: 'Analista Financeiro', role: 'Finanças' },
  { id: '2', name: 'Estrategista de Marketing', role: 'Marketing' },
  { id: '3', name: 'Advogado Cético', role: 'Jurídico' },
  { id: '4', name: 'Especialista em Dados', role: 'Data Science' },
  { id: '5', name: 'Product Manager', role: 'Produto' },
  { id: '6', name: 'Consultor de RH', role: 'Recursos Humanos' },
  { id: '7', name: 'Engenheiro de Software', role: 'Tecnologia' },
  { id: '8', name: 'Designer UX', role: 'Design' },
]

export default function MeetingCreatePage() {
  const navigate = useNavigate()
  const { workspace } = useAuthStore()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState('')
  const [topic, setTopic] = useState('')
  const [meetingType, setMeetingType] = useState('debate')
  const [selectedAgents, setSelectedAgents] = useState<string[]>([])
  const [params, setParams] = useState({ formality: 7, pace: 5, depth: 7, creativity: 5 })

  const toggleAgent = (id: string) => {
    if (selectedAgents.includes(id)) {
      setSelectedAgents(selectedAgents.filter((a) => a !== id))
    } else if (selectedAgents.length < MAX_AGENTS_PER_SESSION) {
      setSelectedAgents([...selectedAgents, id])
    }
  }

  const steps = ['Informações', 'Agentes', 'Parâmetros', 'Revisão']

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(ROUTES.MEETINGS)} className="btn-icon">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-h2">Nova Sessão</h1>
          <p className="text-body-sm text-gray-500">Configure e inicie uma reunião simulada</p>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-body-sm font-semibold ${
              i + 1 <= step ? 'bg-primary-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
            }`}>
              {i + 1}
            </div>
            <span className={`text-body-sm ${i + 1 <= step ? 'font-medium' : 'text-gray-500'}`}>{s}</span>
            {i < steps.length - 1 && <div className="w-8 h-px bg-gray-300 dark:bg-gray-600" />}
          </div>
        ))}
      </div>

      {/* Step 1: Info */}
      {step === 1 && (
        <Card>
          <CardTitle>Informações da Sessão</CardTitle>
          <div className="mt-4 space-y-4">
            <Input label="Título" placeholder="Ex: Análise de impacto da fusão ABC" value={title} onChange={(e) => setTitle(e.target.value)} />
            <div>
              <label className="label">Tópico / Pergunta Central</label>
              <textarea className="input-field min-h-[100px] resize-vertical" placeholder="Qual é o tema principal do debate?" value={topic} onChange={(e) => setTopic(e.target.value)} />
            </div>
            <div>
              <label className="label">Tipo de Sessão</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                {Object.entries(MEETING_TYPES).map(([key, config]) => {
                  const Icon = iconMap[config.icon] || MessageSquare
                  return (
                    <button
                      key={key}
                      onClick={() => setMeetingType(key)}
                      className={`p-4 rounded-xl border-2 text-center transition-all ${
                        meetingType === key
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Icon className={`w-6 h-6 mx-auto mb-2 ${meetingType === key ? 'text-primary-500' : 'text-gray-400'}`} />
                      <span className="text-body-sm font-medium">{config.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Step 2: Agents */}
      {step === 2 && (
        <Card>
          <div className="flex items-center justify-between">
            <CardTitle>Selecionar Agentes ({selectedAgents.length}/{MAX_AGENTS_PER_SESSION})</CardTitle>
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {availableAgents.map((agent) => {
              const selected = selectedAgents.includes(agent.id)
              return (
                <button
                  key={agent.id}
                  onClick={() => toggleAgent(agent.id)}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                    selected
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Avatar name={agent.name} size="md" status={selected ? 'online' : undefined} />
                  <div className="flex-1">
                    <p className="text-body-sm font-medium">{agent.name}</p>
                    <p className="text-body-xs text-gray-500">{agent.role}</p>
                  </div>
                  {selected ? (
                    <X className="w-5 h-5 text-primary-500" />
                  ) : (
                    <Plus className="w-5 h-5 text-gray-400" />
                  )}
                </button>
              )
            })}
          </div>
        </Card>
      )}

      {/* Step 3: Parameters */}
      {step === 3 && (
        <Card>
          <CardTitle>Parâmetros da Sessão</CardTitle>
          <div className="mt-4 space-y-6">
            {[
              { key: 'formality', label: 'Formalidade', desc: 'Casual ← → Formal' },
              { key: 'pace', label: 'Ritmo', desc: 'Lento ← → Rápido' },
              { key: 'depth', label: 'Profundidade', desc: 'Superficial ← → Profundo' },
              { key: 'creativity', label: 'Criatividade', desc: 'Conservador ← → Criativo' },
            ].map(({ key, label, desc }) => (
              <div key={key}>
                <div className="flex justify-between mb-1">
                  <label className="text-body-sm font-medium">{label}</label>
                  <span className="text-body-sm text-primary-500 font-semibold">
                    {params[key as keyof typeof params]}
                  </span>
                </div>
                <input
                  type="range" min="1" max="10"
                  value={params[key as keyof typeof params]}
                  onChange={(e) => setParams({ ...params, [key]: Number(e.target.value) })}
                  className="w-full accent-primary-500"
                />
                <p className="text-body-xs text-gray-400">{desc}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Step 4: Review */}
      {step === 4 && (
        <Card>
          <CardTitle>Revisão da Sessão</CardTitle>
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-body-xs text-gray-500">Título</p>
                <p className="text-body font-medium">{title || '(sem título)'}</p>
              </div>
              <div>
                <p className="text-body-xs text-gray-500">Tipo</p>
                <Badge variant="violet">{MEETING_TYPES[meetingType as keyof typeof MEETING_TYPES]?.label}</Badge>
              </div>
            </div>
            <div>
              <p className="text-body-xs text-gray-500">Tópico</p>
              <p className="text-body">{topic || '(sem tópico definido)'}</p>
            </div>
            <div>
              <p className="text-body-xs text-gray-500 mb-2">Agentes ({selectedAgents.length})</p>
              <div className="flex flex-wrap gap-2">
                {selectedAgents.map((id) => {
                  const agent = availableAgents.find((a) => a.id === id)
                  return agent ? (
                    <div key={id} className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-full px-3 py-1.5">
                      <Avatar name={agent.name} size="xs" />
                      <span className="text-body-xs font-medium">{agent.name}</span>
                    </div>
                  ) : null
                })}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="ghost" onClick={() => step > 1 ? setStep(step - 1) : navigate(ROUTES.MEETINGS)}>
          <ArrowLeft className="w-4 h-4" /> {step > 1 ? 'Voltar' : 'Cancelar'}
        </Button>
        {step < 4 ? (
          <Button onClick={() => setStep(step + 1)}>
            Próximo <ArrowRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            icon={<Play className="w-4 h-4" />}
            loading={loading}
            onClick={async () => {
              if (!workspace?.id) {
                toast.error('Selecione um workspace primeiro')
                return
              }
              setLoading(true)
              try {
                const meeting = await createMeeting({
                  workspace_id: workspace.id,
                  title: title || 'Sessão sem título',
                  topic: topic || undefined,
                  meeting_type: meetingType as string,
                  parameters: params,
                  agent_ids: [], // IDs de agentes reais (UUID) – vincular quando houver agentes na API
                })
                await startMeeting(meeting.id)
                navigate(`/meetings/${meeting.id}/room`)
                toast.success('Sessão iniciada!')
              } catch (err: unknown) {
                toast.error(err instanceof Error ? err.message : 'Erro ao iniciar sessão')
              } finally {
                setLoading(false)
              }
            }}
          >
            Iniciar Sessão
          </Button>
        )}
      </div>
    </div>
  )
}
