import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Avatar } from '@/components/ui/Avatar'
import { ROUTES } from '@/config/routes'
import { PERSONALITY_TRAITS } from '@/config/constants'
import { useAuthStore } from '@/stores/useAuthStore'
import { fetchAgent, updateAgent } from '@/lib/api/agents'
import { ArrowLeft, Save, Play, Upload, Sparkles } from 'lucide-react'

const defaultTraits = {
  professionalism: 8, creativity: 6, detail_orientation: 7,
  assertiveness: 5, empathy: 6, humor: 3,
}

export default function AgentEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { workspace } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'knowledge' | 'appearance' | 'behavior'>('knowledge')
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [description, setDescription] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [traits, setTraits] = useState<Record<string, number>>(defaultTraits)

  const tabs = [
    { id: 'knowledge', label: 'Conhecimento & Prompt' },
    { id: 'appearance', label: 'Aparência & Voz' },
    { id: 'behavior', label: 'Comportamento' },
  ] as const

  useEffect(() => {
    if (!id) return
    fetchAgent(id)
      .then((agent) => {
        setName(agent.name || '')
        setRole(agent.role || '')
        setDescription(agent.description || '')
        setSystemPrompt(agent.system_prompt || '')
        const pt = agent.personality_traits as Record<string, number> | null
        setTraits(pt ? { ...defaultTraits, ...pt } : defaultTraits)
      })
      .catch(() => toast.error('Agente não encontrado'))
      .finally(() => setLoading(false))
  }, [id])

  const handleSave = async () => {
    if (!id || !workspace?.id) return
    setSaving(true)
    try {
      await updateAgent(id, {
        name,
        role,
        description: description || undefined,
        system_prompt: systemPrompt || undefined,
        personality_traits: traits,
      })
      toast.success('Agente atualizado!')
      navigate(ROUTES.AGENTS)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(ROUTES.AGENTS)} className="btn-icon">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-h2">Editar Agente</h1>
            <p className="text-body-sm text-gray-500">{name || 'Agent Studio'}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" icon={<Play className="w-4 h-4" />}>Testar</Button>
          <Button icon={<Save className="w-4 h-4" />} loading={saving} onClick={handleSave}>
            Salvar alterações
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="border-b flex gap-0">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-body-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id ? 'border-primary-500 text-primary-500' : 'border-transparent text-gray-500 hover:text-gray-700'
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
              </div>
              <Card>
                <CardTitle>Base de Conhecimento</CardTitle>
                <div className="mt-3 border-2 border-dashed rounded-lg p-8 text-center">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-body-sm text-gray-500">Arraste documentos aqui ou clique para fazer upload</p>
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
                  <Button variant="secondary" size="sm" icon={<Upload className="w-4 h-4" />}>Fazer Upload</Button>
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
                    </select>
                  </div>
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
                        <span className="text-body-sm text-primary-500 font-semibold">{traits[trait.key] ?? 5}</span>
                      </div>
                      <input
                        type="range"
                        min={trait.min}
                        max={trait.max}
                        value={traits[trait.key] ?? 5}
                        onChange={(e) => setTraits({ ...traits, [trait.key]: Number(e.target.value) })}
                        className="w-full accent-primary-500"
                      />
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardTitle>Preview</CardTitle>
            <div className="mt-4 text-center">
              <Avatar name={name || 'Agente'} size="xl" className="mx-auto" />
              <h3 className="text-body font-semibold mt-3">{name || 'Agente'}</h3>
              <p className="text-body-sm text-gray-500">{role || 'Sem role'}</p>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-500" />
              <CardTitle>Dica</CardTitle>
            </div>
            <p className="text-body-sm text-gray-500 mt-2">
              Agentes com prompts específicos geram respostas mais úteis.
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}
