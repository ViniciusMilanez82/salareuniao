import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Avatar } from '@/components/ui/Avatar'
import { ROUTES } from '@/config/routes'
import { PERSONALITY_TRAITS } from '@/config/constants'
import { useAuthStore } from '@/stores/useAuthStore'
import { createAgent } from '@/lib/api/agents'
import {
  ArrowLeft, Save, Sparkles, BookOpen, Volume2, Bot, HelpCircle, Info
} from 'lucide-react'
import toast from 'react-hot-toast'

const traitDescriptions: Record<string, string> = {
  professionalism: 'Quão formal e profissional é o tom do agente',
  creativity: 'Capacidade de gerar ideias originais e inovadoras',
  detail_orientation: 'Atenção a detalhes e precisão nas respostas',
  assertiveness: 'Firmeza ao defender pontos de vista',
  empathy: 'Sensibilidade para entender diferentes perspectivas',
  humor: 'Uso de leveza e humor nas respostas',
}

export default function AgentCreatePage() {
  const navigate = useNavigate()
  const { workspace } = useAuthStore()
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'knowledge' | 'appearance' | 'behavior'>('knowledge')
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [description, setDescription] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [traits, setTraits] = useState<Record<string, number>>({
    professionalism: 8, creativity: 6, detail_orientation: 7,
    assertiveness: 5, empathy: 6, humor: 3,
  })
  const [voiceType, setVoiceType] = useState('neural-feminina')
  const [testingVoice, setTestingVoice] = useState(false)

  const tabs = [
    { id: 'knowledge', label: 'Conhecimento & Prompt', icon: BookOpen },
    { id: 'appearance', label: 'Aparência & Voz', icon: Volume2 },
    { id: 'behavior', label: 'Comportamento', icon: Sparkles },
  ] as const

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('O nome do agente é obrigatório')
      return
    }
    if (!role.trim()) {
      toast.error('A especialidade do agente é obrigatória')
      return
    }
    if (!workspace?.id) {
      toast.error('Workspace não selecionado')
      return
    }
    setSaving(true)
    try {
      await createAgent({
        workspace_id: workspace.id,
        name,
        role,
        description: description || undefined,
        system_prompt: systemPrompt || undefined,
        personality_traits: traits,
      })
      toast.success('Agente criado com sucesso!')
      navigate(ROUTES.AGENTS)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar agente')
    } finally {
      setSaving(false)
    }
  }

  const handleTestVoice = () => {
    if (testingVoice) {
      window.speechSynthesis.cancel()
      setTestingVoice(false)
      return
    }
    const text = `Olá, eu sou ${name || 'o novo agente'}. ${role ? `Minha especialidade é ${role}.` : ''} Estou pronto para contribuir.`
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'pt-BR'
    utterance.pitch = voiceType.includes('feminina') ? 1.2 : 0.9
    utterance.onend = () => setTestingVoice(false)
    utterance.onerror = () => setTestingVoice(false)
    const voices = window.speechSynthesis.getVoices()
    const ptVoice = voices.find(v => v.lang.startsWith('pt'))
    if (ptVoice) utterance.voice = ptVoice
    setTestingVoice(true)
    window.speechSynthesis.speak(utterance)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(ROUTES.AGENTS)} className="btn-icon" title="Voltar para lista">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-h2 flex items-center gap-2">
              <Bot className="w-7 h-7 text-primary-500" />
              Criar Novo Agente
            </h1>
            <p className="text-body-sm text-gray-500">Configure um agente de IA personalizado para seus debates</p>
          </div>
        </div>
        <Button icon={<Save className="w-4 h-4" />} loading={saving} onClick={handleCreate}>
          Criar Agente
        </Button>
      </div>

      {/* Dica para primeiro agente */}
      <div className="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg flex items-start gap-2 text-body-sm text-primary-700 dark:text-primary-300">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          Defina pelo menos o <strong>nome</strong> e a <strong>especialidade</strong>.
          O prompt principal é o que mais influencia como o agente se comporta nos debates.
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tabs */}
          <div className="border-b flex gap-0">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-body-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-500'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>

          {activeTab === 'knowledge' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input label="Nome do Agente *" placeholder="Ex: Analista Financeiro" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
                <Input label="Especialidade *" placeholder="Ex: Finanças e Investimentos" value={role} onChange={(e) => setRole(e.target.value)} />
              </div>
              <div>
                <label className="label">Descrição</label>
                <textarea
                  className="input-field min-h-[80px] resize-vertical"
                  placeholder="Uma breve descrição do que este agente faz..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div>
                <label className="label flex items-center gap-2">
                  Prompt Principal (System Prompt)
                  <span className="text-body-xs text-gray-400 font-normal">— Define como o agente se comporta</span>
                </label>
                <textarea
                  className="input-field min-h-[200px] resize-vertical font-mono text-body-sm"
                  placeholder="Ex: Você é um analista financeiro sênior com 20 anos de experiência. Sempre analise os números com rigor e apresente dados para sustentar suas opiniões..."
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                />
                <p className="text-body-xs text-gray-400 mt-1">
                  Quanto mais detalhado, melhor. Inclua instruções de estilo, expertise e como o agente deve argumentar.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="space-y-4">
              <Card>
                <CardTitle>Avatar</CardTitle>
                <div className="mt-3 flex items-center gap-6">
                  <Avatar name={name || 'Agente'} size="xl" />
                  <div>
                    <p className="text-body-sm text-gray-500">O avatar é gerado automaticamente a partir do nome.</p>
                    <p className="text-body-xs text-gray-400 mt-1">Upload de imagem disponível após criar o agente.</p>
                  </div>
                </div>
              </Card>
              <Card>
                <CardTitle>Voz Sintética</CardTitle>
                <p className="text-body-xs text-gray-500 mt-1">Teste como o agente soa</p>
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="label">Tipo de Voz</label>
                    <select className="input-field" value={voiceType} onChange={(e) => setVoiceType(e.target.value)}>
                      <option value="neural-feminina">Neural Feminina (PT-BR)</option>
                      <option value="neural-masculina">Neural Masculina (PT-BR)</option>
                    </select>
                  </div>
                  <Button
                    variant={testingVoice ? 'danger' : 'secondary'}
                    icon={<Volume2 className="w-4 h-4" />}
                    onClick={handleTestVoice}
                  >
                    {testingVoice ? 'Parar' : 'Testar Voz'}
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'behavior' && (
            <div className="space-y-4">
              <Card>
                <CardTitle>Traços de Personalidade</CardTitle>
                <p className="text-body-xs text-gray-500 mt-1">Ajuste para definir como o agente se comporta nos debates</p>
                <div className="mt-4 space-y-5">
                  {PERSONALITY_TRAITS.map((trait) => (
                    <div key={trait.key}>
                      <div className="flex justify-between mb-1">
                        <div>
                          <label className="text-body-sm font-medium">{trait.label}</label>
                          <p className="text-body-xs text-gray-400">{traitDescriptions[trait.key] || ''}</p>
                        </div>
                        <span className="text-body-sm text-primary-500 font-semibold">{traits[trait.key]}/10</span>
                      </div>
                      <input
                        type="range"
                        min={trait.min}
                        max={trait.max}
                        value={traits[trait.key]}
                        onChange={(e) => setTraits({ ...traits, [trait.key]: Number(e.target.value) })}
                        className="w-full accent-primary-500"
                      />
                      <div className="flex justify-between text-body-xs text-gray-400 mt-0.5">
                        <span>Baixo</span>
                        <span>Alto</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </div>

        {/* Preview Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardTitle>Preview do Agente</CardTitle>
            <div className="mt-4 text-center">
              <Avatar name={name || 'Novo Agente'} size="xl" className="mx-auto" />
              <h3 className="text-body font-semibold mt-3">{name || 'Nome do Agente'}</h3>
              <p className="text-body-sm text-gray-500">{role || 'Especialidade'}</p>
              {description && (
                <p className="text-body-xs text-gray-400 mt-2 line-clamp-3">{description}</p>
              )}
            </div>
            <div className="mt-4 pt-4 border-t">
              <p className="text-body-xs text-gray-500 mb-2">Personalidade:</p>
              <div className="space-y-1.5">
                {PERSONALITY_TRAITS.slice(0, 4).map((trait) => (
                  <div key={trait.key} className="flex items-center gap-2">
                    <span className="text-body-xs text-gray-500 w-20">{trait.label}</span>
                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                      <div
                        className="bg-primary-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${(traits[trait.key] ?? 5) * 10}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-primary-500" />
              <CardTitle>O que é cada aba?</CardTitle>
            </div>
            <ul className="text-body-xs text-gray-500 mt-2 space-y-2">
              <li><strong>Conhecimento:</strong> Nome, especialidade e o prompt que define o agente</li>
              <li><strong>Aparência:</strong> Avatar e configuração de voz</li>
              <li><strong>Comportamento:</strong> Traços de personalidade que influenciam o estilo</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  )
}
