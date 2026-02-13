import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/stores/useAuthStore'
import { createMeeting, startMeeting } from '@/lib/api/meetings'
import { fetchAgents } from '@/lib/api/agents'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { ROUTES } from '@/config/routes'
import { MEETING_TYPES, MAX_AGENTS_PER_SESSION } from '@/config/constants'
import {
  ArrowLeft, ArrowRight, Play, Bot, X, Plus, Check,
  MessageSquare, Lightbulb, BarChart3, Target, ClipboardCheck, Handshake, Settings,
  HelpCircle, Info, Sparkles
} from 'lucide-react'

const iconMap: Record<string, React.ElementType> = {
  MessageSquare, Lightbulb, BarChart3, Target, ClipboardCheck, Handshake, Settings,
}

const typeDescriptions: Record<string, string> = {
  debate: 'Agentes debatem o tema apresentando prós e contras',
  brainstorm: 'Geração livre de ideias criativas sobre o tópico',
  analysis: 'Análise profunda e estruturada de dados e cenários',
  strategy: 'Planejamento estratégico com diferentes perspectivas',
  review: 'Revisão crítica de documentos, planos ou propostas',
  negotiation: 'Simulação de negociação entre partes',
  custom: 'Formato personalizado — você define as regras',
}

const paramDescriptions: Record<string, { low: string; high: string; desc: string }> = {
  formality: { low: 'Casual, descontraído', high: 'Formal, profissional', desc: 'Define o tom da conversa' },
  pace: { low: 'Respostas detalhadas', high: 'Respostas rápidas e diretas', desc: 'Velocidade das respostas' },
  depth: { low: 'Visão geral', high: 'Análise aprofundada', desc: 'Nível de profundidade' },
  creativity: { low: 'Conservador, baseado em fatos', high: 'Criativo, com novas ideias', desc: 'Quão inovadoras são as respostas' },
}

type AgentOption = { id: string; name: string; role: string; avatar_url?: string | null; description?: string | null }

export default function MeetingCreatePage() {
  const navigate = useNavigate()
  const { workspace } = useAuthStore()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState('')
  const [topic, setTopic] = useState('')
  const [meetingType, setMeetingType] = useState('debate')
  const [selectedAgents, setSelectedAgents] = useState<string[]>([])
  const [availableAgents, setAvailableAgents] = useState<AgentOption[]>([])
  const [params, setParams] = useState({ formality: 7, pace: 5, depth: 7, creativity: 5 })

  useEffect(() => {
    if (workspace?.id) {
      fetchAgents(workspace.id)
        .then((data) => setAvailableAgents(data.map((a: any) => ({
          id: a.id, name: a.name, role: a.role, avatar_url: a.avatar_url, description: a.description
        }))))
        .catch(() => setAvailableAgents([]))
    }
  }, [workspace?.id])

  const toggleAgent = (id: string) => {
    if (selectedAgents.includes(id)) {
      setSelectedAgents(selectedAgents.filter((a) => a !== id))
    } else if (selectedAgents.length < MAX_AGENTS_PER_SESSION) {
      setSelectedAgents([...selectedAgents, id])
    } else {
      toast.error(`Máximo de ${MAX_AGENTS_PER_SESSION} agentes por sessão`)
    }
  }

  const steps = [
    { label: 'Informações', desc: 'Tema e tipo' },
    { label: 'Agentes', desc: 'Quem participa' },
    { label: 'Parâmetros', desc: 'Tom do debate' },
    { label: 'Revisão', desc: 'Conferir e iniciar' },
  ]

  const canAdvance = () => {
    if (step === 1) return title.trim().length > 0
    if (step === 2) return selectedAgents.length >= 2
    return true
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(ROUTES.MEETINGS)} className="btn-icon" title="Voltar">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-h2">Nova Sessão</h1>
          <p className="text-body-sm text-gray-500">Configure e inicie um debate com agentes de IA</p>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s.label} className="flex items-center gap-2">
            <button
              onClick={() => i + 1 < step && setStep(i + 1)}
              className={`flex items-center gap-2 ${i + 1 < step ? 'cursor-pointer' : ''}`}
              disabled={i + 1 > step}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-body-sm font-semibold transition-colors ${
                i + 1 < step ? 'bg-secondary-500 text-white' :
                i + 1 === step ? 'bg-primary-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
              }`}>
                {i + 1 < step ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <div className="hidden md:block">
                <span className={`text-body-sm ${i + 1 <= step ? 'font-medium' : 'text-gray-500'}`}>{s.label}</span>
                <p className="text-body-xs text-gray-400">{s.desc}</p>
              </div>
            </button>
            {i < steps.length - 1 && <div className="w-8 h-px bg-gray-300 dark:bg-gray-600" />}
          </div>
        ))}
      </div>

      {/* Step 1: Info */}
      {step === 1 && (
        <Card>
          <CardTitle>Sobre o que será o debate?</CardTitle>
          <p className="text-body-sm text-gray-500 mt-1">
            Dê um título e descreva o tema que os agentes de IA vão discutir
          </p>
          <div className="mt-4 space-y-4">
            <Input
              label="Título da sessão *"
              placeholder="Ex: Análise de impacto da fusão ABC"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
            <div>
              <label className="label">Tópico / Pergunta Central</label>
              <textarea
                className="input-field min-h-[100px] resize-vertical"
                placeholder="Ex: Quais são os prós e contras da fusão entre as empresas ABC e XYZ? Considere impactos financeiros, culturais e de mercado."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
              <p className="text-body-xs text-gray-400 mt-1">
                Quanto mais detalhado o tópico, melhores serão as respostas dos agentes
              </p>
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
                      <span className="text-body-sm font-medium block">{config.label}</span>
                      {meetingType === key && (
                        <p className="text-body-xs text-gray-500 mt-1">{typeDescriptions[key]}</p>
                      )}
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
            <div>
              <CardTitle>Quem participa do debate?</CardTitle>
              <p className="text-body-sm text-gray-500 mt-1">
                Selecione pelo menos 2 agentes. Cada um traz uma perspectiva diferente.
              </p>
            </div>
            <Badge variant={selectedAgents.length >= 2 ? 'success' : 'warning'}>
              {selectedAgents.length}/{MAX_AGENTS_PER_SESSION} selecionados
            </Badge>
          </div>
          {selectedAgents.length < 2 && (
            <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg flex items-center gap-2 text-body-sm text-amber-700 dark:text-amber-400">
              <Info className="w-4 h-4 shrink-0" />
              Selecione pelo menos 2 agentes para iniciar um debate
            </div>
          )}
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
                  <Avatar name={agent.name} size="md" src={agent.avatar_url} status={selected ? 'online' : undefined} />
                  <div className="flex-1 min-w-0">
                    <p className="text-body-sm font-medium">{agent.name}</p>
                    <p className="text-body-xs text-gray-500">{agent.role}</p>
                    {agent.description && (
                      <p className="text-body-xs text-gray-400 truncate mt-0.5">{agent.description}</p>
                    )}
                  </div>
                  {selected ? (
                    <div className="w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
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
          <CardTitle>Como deve ser o tom do debate?</CardTitle>
          <p className="text-body-sm text-gray-500 mt-1">
            Ajuste os parâmetros para definir o estilo da conversa entre os agentes
          </p>
          <div className="mt-4 space-y-6">
            {[
              { key: 'formality', label: 'Formalidade' },
              { key: 'pace', label: 'Ritmo' },
              { key: 'depth', label: 'Profundidade' },
              { key: 'creativity', label: 'Criatividade' },
            ].map(({ key, label }) => {
              const info = paramDescriptions[key]
              return (
                <div key={key}>
                  <div className="flex justify-between mb-1">
                    <div>
                      <label className="text-body-sm font-medium">{label}</label>
                      <p className="text-body-xs text-gray-400">{info.desc}</p>
                    </div>
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
                  <div className="flex justify-between text-body-xs text-gray-400">
                    <span>{info.low}</span>
                    <span>{info.high}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Step 4: Review */}
      {step === 4 && (
        <Card>
          <CardTitle>Tudo pronto! Confira os detalhes:</CardTitle>
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
            <div className="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg flex items-start gap-2 text-body-sm text-primary-700 dark:text-primary-300">
              <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Ao iniciar, você entrará na sala de debate. Clique em "Próximo turno" para cada agente falar. 
                Você pode encerrar a sessão a qualquer momento.
              </span>
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
          <Button
            onClick={() => setStep(step + 1)}
            disabled={!canAdvance()}
          >
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
                  agent_ids: selectedAgents,
                })
                await startMeeting(meeting.id)
                navigate(`/meetings/${meeting.id}/room`)
                toast.success('Sessão iniciada! Clique em "Próximo turno" para os agentes começarem.')
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
