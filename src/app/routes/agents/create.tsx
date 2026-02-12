import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { ROUTES } from '@/config/routes'
import { PERSONALITY_TRAITS } from '@/config/constants'
import { ArrowLeft, Save, Play, Upload, Sparkles } from 'lucide-react'

export default function AgentCreatePage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'knowledge' | 'appearance' | 'behavior'>('knowledge')
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [description, setDescription] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [traits, setTraits] = useState<Record<string, number>>({
    professionalism: 8, creativity: 6, detail_orientation: 7,
    assertiveness: 5, empathy: 6, humor: 3,
  })

  const tabs = [
    { id: 'knowledge', label: 'Conhecimento & Prompt' },
    { id: 'appearance', label: 'Aparência & Voz' },
    { id: 'behavior', label: 'Comportamento' },
  ] as const

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(ROUTES.AGENTS)} className="btn-icon">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-h2">Agent Studio</h1>
            <p className="text-body-sm text-gray-500">Criar novo agente de IA</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" icon={<Play className="w-4 h-4" />}>Testar</Button>
          <Button icon={<Save className="w-4 h-4" />}>Publicar</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tabs */}
          <div className="border-b flex gap-0">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-body-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-500'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'knowledge' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input label="Nome do Agente" placeholder="Ex: Analista Financeiro" value={name} onChange={(e) => setName(e.target.value)} />
                <Input label="Role / Expertise" placeholder="Ex: Finanças" value={role} onChange={(e) => setRole(e.target.value)} />
              </div>
              <div>
                <label className="label">Descrição</label>
                <textarea
                  className="input-field min-h-[80px] resize-vertical"
                  placeholder="Descreva brevemente o agente..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Prompt Principal (System Prompt)</label>
                <textarea
                  className="input-field min-h-[200px] resize-vertical font-mono text-body-sm"
                  placeholder="Defina o conhecimento, personalidade e comportamento do agente..."
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                />
                <p className="text-body-xs text-gray-400 mt-1">
                  Markdown suportado. Seja específico sobre expertise, vieses e estilo de comunicação.
                </p>
              </div>
              <Card>
                <CardTitle>Base de Conhecimento</CardTitle>
                <div className="mt-3 border-2 border-dashed rounded-lg p-8 text-center">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-body-sm text-gray-500">Arraste documentos aqui ou clique para fazer upload</p>
                  <p className="text-body-xs text-gray-400 mt-1">PDF, DOCX, TXT, MD - até 10MB por arquivo</p>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="space-y-4">
              <Card>
                <CardTitle>Avatar</CardTitle>
                <div className="mt-3 flex items-center gap-6">
                  <Avatar name={name || 'Agente'} size="xl" />
                  <div>
                    <Button variant="secondary" size="sm" icon={<Upload className="w-4 h-4" />}>
                      Fazer Upload
                    </Button>
                    <p className="text-body-xs text-gray-400 mt-2">PNG, JPG - Recomendado 256x256px</p>
                  </div>
                </div>
              </Card>
              <Card>
                <CardTitle>Voz Sintética</CardTitle>
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="label">Tipo de Voz</label>
                    <select className="input-field">
                      <option>Neural Feminina (PT-BR)</option>
                      <option>Neural Masculina (PT-BR)</option>
                      <option>Neural Feminina (EN-US)</option>
                      <option>Neural Masculina (EN-US)</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Velocidade</label>
                      <input type="range" min="0.5" max="2" step="0.1" defaultValue="1" className="w-full accent-primary-500" />
                    </div>
                    <div>
                      <label className="label">Tom (Pitch)</label>
                      <input type="range" min="0.5" max="2" step="0.1" defaultValue="1" className="w-full accent-primary-500" />
                    </div>
                  </div>
                  <Button variant="secondary" size="sm" icon={<Play className="w-4 h-4" />}>
                    Testar Voz
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'behavior' && (
            <div className="space-y-4">
              <Card>
                <CardTitle>Traços de Personalidade</CardTitle>
                <div className="mt-4 space-y-4">
                  {PERSONALITY_TRAITS.map((trait) => (
                    <div key={trait.key}>
                      <div className="flex justify-between mb-1">
                        <label className="text-body-sm font-medium">{trait.label}</label>
                        <span className="text-body-sm text-primary-500 font-semibold">
                          {traits[trait.key]}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={trait.min}
                        max={trait.max}
                        value={traits[trait.key]}
                        onChange={(e) => setTraits({ ...traits, [trait.key]: Number(e.target.value) })}
                        className="w-full accent-primary-500"
                      />
                    </div>
                  ))}
                </div>
              </Card>
              <Card>
                <CardTitle>Parâmetros do Modelo</CardTitle>
                <div className="mt-3 grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Temperatura</label>
                    <input type="range" min="0" max="2" step="0.1" defaultValue="0.7" className="w-full accent-primary-500" />
                    <p className="text-body-xs text-gray-400 mt-1">0 = Determinístico, 2 = Criativo</p>
                  </div>
                  <div>
                    <label className="label">Max Tokens</label>
                    <Input type="number" defaultValue="4000" />
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>

        {/* Preview Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardTitle>Preview</CardTitle>
            <div className="mt-4 text-center">
              <Avatar name={name || 'Novo Agente'} size="xl" className="mx-auto" />
              <h3 className="text-body font-semibold mt-3">{name || 'Novo Agente'}</h3>
              <p className="text-body-sm text-gray-500">{role || 'Sem role definida'}</p>
              {description && (
                <p className="text-body-xs text-gray-400 mt-2 line-clamp-3">{description}</p>
              )}
            </div>
            <div className="mt-4 space-y-2">
              {Object.entries(traits).map(([key, val]) => {
                const label = PERSONALITY_TRAITS.find((t) => t.key === key)?.label || key
                return (
                  <div key={key} className="flex items-center gap-2">
                    <span className="text-body-xs text-gray-500 w-28">{label}</span>
                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                      <div
                        className="bg-primary-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${val * 10}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-500" />
              <CardTitle>Dica</CardTitle>
            </div>
            <p className="text-body-sm text-gray-500 mt-2">
              Agentes com prompts específicos e detalhados geram respostas mais úteis.
              Inclua exemplos de como o agente deve se comportar em diferentes situações.
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}
