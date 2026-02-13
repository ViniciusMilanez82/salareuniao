import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { ROUTES } from '@/config/routes'
import { PERSONALITY_TRAITS } from '@/config/constants'
import { useAuthStore } from '@/stores/useAuthStore'
import { fetchAgent, updateAgent, fetchAgentKnowledge, addAgentKnowledge } from '@/lib/api/agents'
import {
  ArrowLeft, Save, Play, Upload, Sparkles, Trash2, FileText,
  Plus, Volume2, VolumeX, BookOpen, Info, HelpCircle
} from 'lucide-react'

const defaultTraits = {
  professionalism: 8, creativity: 6, detail_orientation: 7,
  assertiveness: 5, empathy: 6, humor: 3,
}

type KnowledgeItem = {
  id: string
  title: string
  content: string
  category?: string | null
  source_type?: string
  created_at?: string
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

  // Knowledge base
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>([])
  const [loadingKnowledge, setLoadingKnowledge] = useState(false)
  const [showAddKnowledge, setShowAddKnowledge] = useState(false)
  const [knowledgeTitle, setKnowledgeTitle] = useState('')
  const [knowledgeContent, setKnowledgeContent] = useState('')
  const [knowledgeCategory, setKnowledgeCategory] = useState('')
  const [savingKnowledge, setSavingKnowledge] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Voice test
  const [testingVoice, setTestingVoice] = useState(false)
  const [voiceType, setVoiceType] = useState('neural-feminina')
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null)

  const tabs = [
    { id: 'knowledge', label: 'Conhecimento & Prompt', icon: BookOpen },
    { id: 'appearance', label: 'Aparência & Voz', icon: Volume2 },
    { id: 'behavior', label: 'Comportamento', icon: Sparkles },
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

    // Carregar knowledge base
    loadKnowledge()
  }, [id])

  const loadKnowledge = async () => {
    if (!id) return
    setLoadingKnowledge(true)
    try {
      const items = await fetchAgentKnowledge(id)
      setKnowledgeItems(items as KnowledgeItem[])
    } catch {
      setKnowledgeItems([])
    } finally {
      setLoadingKnowledge(false)
    }
  }

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

  const handleAddKnowledge = async () => {
    if (!id || !knowledgeTitle.trim() || !knowledgeContent.trim()) {
      toast.error('Título e conteúdo são obrigatórios')
      return
    }
    setSavingKnowledge(true)
    try {
      await addAgentKnowledge(id, {
        title: knowledgeTitle,
        content: knowledgeContent,
        category: knowledgeCategory || undefined,
        source_type: 'manual',
      })
      toast.success('Conhecimento adicionado!')
      setKnowledgeTitle('')
      setKnowledgeContent('')
      setKnowledgeCategory('')
      setShowAddKnowledge(false)
      loadKnowledge()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao adicionar')
    } finally {
      setSavingKnowledge(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !id) return

    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      toast.error('Arquivo muito grande. Máximo: 5MB')
      return
    }

    const allowedTypes = ['text/plain', 'text/markdown', 'application/pdf', 'text/csv']
    const allowedExts = ['.txt', '.md', '.csv']
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()

    if (!allowedTypes.includes(file.type) && !allowedExts.includes(ext)) {
      toast.error('Tipo de arquivo não suportado. Use: TXT, MD ou CSV')
      return
    }

    try {
      const text = await file.text()
      setSavingKnowledge(true)
      await addAgentKnowledge(id, {
        title: file.name,
        content: text.substring(0, 50000), // Limitar a 50k chars
        category: 'upload',
        source_type: 'upload',
      })
      toast.success(`Arquivo "${file.name}" importado com sucesso!`)
      loadKnowledge()
    } catch {
      toast.error('Erro ao importar arquivo')
    } finally {
      setSavingKnowledge(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleTestVoice = () => {
    if (testingVoice) {
      window.speechSynthesis.cancel()
      setTestingVoice(false)
      return
    }

    const text = `Olá, eu sou ${name || 'o agente'}. ${role ? `Minha especialidade é ${role}.` : ''} Estou pronto para contribuir na reunião.`
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'pt-BR'
    utterance.rate = 1.0
    utterance.pitch = voiceType.includes('feminina') ? 1.2 : 0.9

    // Tentar encontrar voz pt-BR
    const voices = window.speechSynthesis.getVoices()
    const ptVoice = voices.find(v => v.lang.startsWith('pt') && (
      voiceType.includes('feminina') ? v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('femin') : true
    )) || voices.find(v => v.lang.startsWith('pt'))
    if (ptVoice) utterance.voice = ptVoice

    utterance.onend = () => setTestingVoice(false)
    utterance.onerror = () => setTestingVoice(false)

    speechSynthRef.current = utterance
    setTestingVoice(true)
    window.speechSynthesis.speak(utterance)
  }

  // Cleanup voice on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel()
    }
  }, [])

  const traitDescriptions: Record<string, string> = {
    professionalism: 'Quão formal e profissional é o tom do agente',
    creativity: 'Capacidade de gerar ideias originais e inovadoras',
    detail_orientation: 'Atenção a detalhes e precisão nas respostas',
    assertiveness: 'Firmeza ao defender pontos de vista',
    empathy: 'Sensibilidade para entender diferentes perspectivas',
    humor: 'Uso de leveza e humor nas respostas',
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
          <button onClick={() => navigate(ROUTES.AGENTS)} className="btn-icon" title="Voltar para lista de agentes">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-h2">Editar Agente</h1>
            <p className="text-body-sm text-gray-500">{name || 'Configure seu agente de IA'}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button icon={<Save className="w-4 h-4" />} loading={saving} onClick={handleSave}>
            Salvar alterações
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                    activeTab === tab.id ? 'border-primary-500 text-primary-500' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Tab: Knowledge */}
          {activeTab === 'knowledge' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input label="Nome do Agente" placeholder="Ex: Analista Financeiro" value={name} onChange={(e) => setName(e.target.value)} />
                <Input label="Especialidade" placeholder="Ex: Finanças e Investimentos" value={role} onChange={(e) => setRole(e.target.value)} />
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
                  <span className="text-body-xs text-gray-400 font-normal">
                    — Define como o agente se comporta e responde
                  </span>
                </label>
                <textarea
                  className="input-field min-h-[200px] resize-vertical font-mono text-body-sm"
                  placeholder="Ex: Você é um analista financeiro sênior com 20 anos de experiência. Sempre analise os números com rigor e apresente dados para sustentar suas opiniões..."
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                />
              </div>

              {/* Knowledge Base */}
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Base de Conhecimento</CardTitle>
                    <p className="text-body-xs text-gray-500 mt-1">
                      Adicione documentos e informações que o agente pode usar durante debates
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Upload className="w-4 h-4" />}
                      onClick={() => fileInputRef.current?.click()}
                      loading={savingKnowledge}
                    >
                      Upload
                    </Button>
                    <Button
                      size="sm"
                      icon={<Plus className="w-4 h-4" />}
                      onClick={() => setShowAddKnowledge(true)}
                    >
                      Adicionar
                    </Button>
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.md,.csv"
                  className="hidden"
                  onChange={handleFileUpload}
                />

                {/* Add Knowledge Form */}
                {showAddKnowledge && (
                  <div className="mt-4 p-4 bg-gray-50 dark:bg-surface-dark rounded-lg border space-y-3 animate-fade-in">
                    <Input
                      label="Título"
                      placeholder="Ex: Relatório Q4 2024"
                      value={knowledgeTitle}
                      onChange={(e) => setKnowledgeTitle(e.target.value)}
                    />
                    <Input
                      label="Categoria (opcional)"
                      placeholder="Ex: Finanças, Mercado, Técnico"
                      value={knowledgeCategory}
                      onChange={(e) => setKnowledgeCategory(e.target.value)}
                    />
                    <div>
                      <label className="label">Conteúdo</label>
                      <textarea
                        className="input-field min-h-[120px] resize-vertical"
                        placeholder="Cole aqui o conteúdo que o agente deve conhecer..."
                        value={knowledgeContent}
                        onChange={(e) => setKnowledgeContent(e.target.value)}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setShowAddKnowledge(false)}>Cancelar</Button>
                      <Button size="sm" icon={<Save className="w-4 h-4" />} loading={savingKnowledge} onClick={handleAddKnowledge}>
                        Salvar Conhecimento
                      </Button>
                    </div>
                  </div>
                )}

                {/* Knowledge List */}
                {loadingKnowledge ? (
                  <p className="text-body-sm text-gray-500 mt-4">Carregando...</p>
                ) : knowledgeItems.length === 0 ? (
                  <div className="mt-4 border-2 border-dashed rounded-lg p-8 text-center">
                    <BookOpen className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-body-sm text-gray-500">Nenhum conhecimento adicionado</p>
                    <p className="text-body-xs text-gray-400 mt-1">
                      Faça upload de arquivos (.txt, .md) ou adicione texto manualmente para dar mais contexto ao agente
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 space-y-2">
                    {knowledgeItems.map((item) => (
                      <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-surface-dark border">
                        <FileText className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-body-sm font-medium truncate">{item.title}</p>
                          <p className="text-body-xs text-gray-500 line-clamp-2 mt-0.5">{item.content?.substring(0, 200)}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {item.category && <Badge variant="info">{item.category}</Badge>}
                            {item.source_type && <Badge>{item.source_type}</Badge>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* Tab: Appearance & Voice */}
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
                    <p className="text-body-xs text-gray-400 mt-1">JPG, PNG — Máx 2MB</p>
                  </div>
                </div>
              </Card>
              <Card>
                <CardTitle>Voz Sintética</CardTitle>
                <p className="text-body-xs text-gray-500 mt-1">
                  Configure a voz do agente para ouvir como ele soa durante as sessões
                </p>
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="label">Tipo de Voz</label>
                    <select
                      className="input-field"
                      value={voiceType}
                      onChange={(e) => setVoiceType(e.target.value)}
                    >
                      <option value="neural-feminina">Neural Feminina (PT-BR)</option>
                      <option value="neural-masculina">Neural Masculina (PT-BR)</option>
                    </select>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant={testingVoice ? 'danger' : 'secondary'}
                      icon={testingVoice ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      onClick={handleTestVoice}
                    >
                      {testingVoice ? 'Parar' : 'Testar Voz'}
                    </Button>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-surface-dark rounded-lg text-body-xs text-gray-500 flex items-start gap-2">
                    <Info className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                    <span>
                      O teste usa a síntese de voz do navegador. Em produção, a voz será gerada pela ElevenLabs 
                      (configure a API key em Admin {">"} Integrações).
                    </span>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Tab: Behavior */}
          {activeTab === 'behavior' && (
            <div className="space-y-4">
              <Card>
                <CardTitle>Traços de Personalidade</CardTitle>
                <p className="text-body-xs text-gray-500 mt-1">
                  Ajuste os traços para definir como o agente se comporta durante debates
                </p>
                <div className="mt-4 space-y-5">
                  {PERSONALITY_TRAITS.map((trait) => (
                    <div key={trait.key}>
                      <div className="flex justify-between mb-1">
                        <div>
                          <label className="text-body-sm font-medium">{trait.label}</label>
                          <p className="text-body-xs text-gray-400">{traitDescriptions[trait.key] || ''}</p>
                        </div>
                        <span className="text-body-sm text-primary-500 font-semibold">{traits[trait.key] ?? 5}/10</span>
                      </div>
                      <input
                        type="range"
                        min={trait.min}
                        max={trait.max}
                        value={traits[trait.key] ?? 5}
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

        {/* Sidebar Preview */}
        <div className="space-y-4">
          <Card>
            <CardTitle>Preview do Agente</CardTitle>
            <div className="mt-4 text-center">
              <Avatar name={name || 'Agente'} size="xl" className="mx-auto" />
              <h3 className="text-body font-semibold mt-3">{name || 'Nome do Agente'}</h3>
              <p className="text-body-sm text-gray-500">{role || 'Especialidade'}</p>
              {description && (
                <p className="text-body-xs text-gray-400 mt-2 line-clamp-3">{description}</p>
              )}
            </div>
            <div className="mt-4 pt-4 border-t">
              <p className="text-body-xs text-gray-500 mb-2">Personalidade:</p>
              <div className="space-y-1.5">
                {PERSONALITY_TRAITS.slice(0, 3).map((trait) => (
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
              <Sparkles className="w-4 h-4 text-violet-500" />
              <CardTitle>Dica</CardTitle>
            </div>
            <p className="text-body-sm text-gray-500 mt-2">
              Agentes com prompts específicos e base de conhecimento geram respostas muito mais úteis nos debates. 
              Tente incluir exemplos de como o agente deve argumentar.
            </p>
          </Card>
          <Card>
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-primary-500" />
              <CardTitle>O que é cada aba?</CardTitle>
            </div>
            <ul className="text-body-xs text-gray-500 mt-2 space-y-2">
              <li><strong>Conhecimento:</strong> Defina o nome, prompt e documentos de referência</li>
              <li><strong>Aparência:</strong> Configure avatar e voz do agente</li>
              <li><strong>Comportamento:</strong> Ajuste personalidade e estilo de debate</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  )
}
