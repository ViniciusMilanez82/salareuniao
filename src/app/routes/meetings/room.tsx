import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ROUTES } from '@/config/routes'
import { fetchMeeting, runMeetingTurn, endMeeting } from '@/lib/api/meetings'
import { connectMeetingRoom, disconnectMeetingRoom } from '@/lib/supabase/realtime'
import {
  Play, Pause, Square, MessageSquare, ChevronRight, ArrowLeft,
  SkipForward, Users, FileText, Download,
  Maximize, Minimize, Zap, HelpCircle, Info, Settings2, Loader2
} from 'lucide-react'
import toast from 'react-hot-toast'

type AgentRow = { agent_id: string; agent_name: string; agent_role: string; agent_avatar?: string }
type TranscriptRow = { id: string; speaker_name: string; content: string; sequence_number: number; speaker_type?: string }

export default function MeetingRoomPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [meeting, setMeeting] = useState<{ title: string; status: string; topic?: string; agents?: AgentRow[] } | null>(null)
  const [transcripts, setTranscripts] = useState<TranscriptRow[]>([])
  const [loading, setLoading] = useState(true)
  const [runningTurn, setRunningTurn] = useState(false)
  const [showTranscript, setShowTranscript] = useState(true)
  const [lastSpeaker, setLastSpeaker] = useState<string | null>(null)
  const [showHelp, setShowHelp] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const transcriptEndRef = useRef<HTMLDivElement>(null)

  // === AUTO-PLAY ===
  const [autoPlay, setAutoPlay] = useState(false)
  const [autoDelay, setAutoDelay] = useState(3) // segundos entre turnos
  const [maxTurns, setMaxTurns] = useState(20) // limite de turnos automáticos
  const [turnsExecuted, setTurnsExecuted] = useState(0)
  const [countdown, setCountdown] = useState(0)
  const autoPlayRef = useRef(false)
  const countdownRef = useRef<ReturnType<typeof setInterval>>()
  const abortRef = useRef(false)

  // Scroll automático do transcript
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }, [])

  // Carregar meeting e conectar WebSocket
  useEffect(() => {
    if (!id) return
    fetchMeeting(id)
      .then((data: any) => {
        setMeeting(data)
        setTranscripts(data.transcripts || [])
        if ((data.transcripts || []).length > 0) {
          setLastSpeaker(data.transcripts[data.transcripts.length - 1].speaker_name)
        }
        setTurnsExecuted((data.transcripts || []).length)
      })
      .catch(() => toast.error('Erro ao carregar sessão'))
      .finally(() => setLoading(false))

    // Conectar WebSocket
    try {
      connectMeetingRoom(id, {
        onTranscript: (data: any) => {
          setTranscripts((prev) => {
            const exists = prev.find(t => t.sequence_number === data.sequence_number)
            if (exists) return prev
            return [...prev, data]
          })
          setLastSpeaker(data.speaker_name)
          scrollToBottom()
        },
        onMeetingStatus: (data: any) => {
          if (data.status) {
            setMeeting((prev) => prev ? { ...prev, status: data.status } : prev)
            if (data.status === 'completed') {
              toast.success('Sessão encerrada')
              setAutoPlay(false)
              autoPlayRef.current = false
            }
          }
        },
        onAgentStatus: () => {},
      })
    } catch {
      console.log('WebSocket não disponível, usando polling')
    }

    return () => {
      disconnectMeetingRoom()
      autoPlayRef.current = false
      abortRef.current = true
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [id, scrollToBottom])

  // Scroll ao carregar transcripts
  useEffect(() => {
    scrollToBottom()
  }, [transcripts.length, scrollToBottom])

  const refreshTranscripts = async () => {
    if (!id) return
    try {
      const data = await fetchMeeting(id) as any
      setTranscripts(data.transcripts || [])
      const last = (data.transcripts || []).slice(-1)[0]
      if (last) setLastSpeaker(last.speaker_name)
      return data.transcripts || []
    } catch {
      return []
    }
  }

  // === Executar um turno ===
  const executeTurn = async (): Promise<boolean> => {
    if (!id) return false
    setRunningTurn(true)
    try {
      await runMeetingTurn(id, 'openai')
      await refreshTranscripts()
      setTurnsExecuted((prev) => prev + 1)
      return true
    } catch (err: any) {
      const msg = err?.message || ''
      if (msg.includes('API key')) {
        toast.error('API da OpenAI não configurada. Vá em Admin > Integrações para configurar.')
      } else {
        toast.error(msg || 'Erro ao executar turno')
      }
      return false
    } finally {
      setRunningTurn(false)
    }
  }

  // === Turno manual ===
  const handleRunTurn = async () => {
    if (runningTurn) return
    const success = await executeTurn()
    if (success) toast.success('Turno executado!')
  }

  // === AUTO-PLAY LOOP ===
  useEffect(() => {
    if (!autoPlay || !id) return

    autoPlayRef.current = true
    abortRef.current = false

    const runAutoLoop = async () => {
      while (autoPlayRef.current && !abortRef.current) {
        // Verificar limites
        if (turnsExecuted >= maxTurns) {
          toast.success(`Limite de ${maxTurns} turnos atingido!`)
          setAutoPlay(false)
          autoPlayRef.current = false
          break
        }

        // Countdown antes do próximo turno
        setCountdown(autoDelay)
        for (let i = autoDelay; i > 0; i--) {
          if (!autoPlayRef.current || abortRef.current) break
          setCountdown(i)
          await new Promise((r) => setTimeout(r, 1000))
        }
        setCountdown(0)

        if (!autoPlayRef.current || abortRef.current) break

        // Executar turno
        const success = await executeTurn()
        if (!success) {
          setAutoPlay(false)
          autoPlayRef.current = false
          break
        }
      }
    }

    runAutoLoop()

    return () => {
      autoPlayRef.current = false
    }
  }, [autoPlay]) // eslint-disable-line react-hooks/exhaustive-deps

  // === Sincronizar ref com state ===
  useEffect(() => {
    autoPlayRef.current = autoPlay
  }, [autoPlay])

  const toggleAutoPlay = () => {
    if (autoPlay) {
      // Parar
      setAutoPlay(false)
      autoPlayRef.current = false
      setCountdown(0)
      toast.success('Auto-debate pausado')
    } else {
      // Iniciar
      setAutoPlay(true)
      toast.success('Auto-debate iniciado! Os agentes vão conversar automaticamente.')
    }
  }

  const handleEndMeeting = async () => {
    if (!id) return
    if (!confirm('Tem certeza que deseja encerrar esta sessão?')) return
    setAutoPlay(false)
    autoPlayRef.current = false
    try {
      await endMeeting(id)
      toast.success('Sessão encerrada com sucesso!')
      navigate(ROUTES.MEETINGS)
    } catch {
      toast.error('Erro ao encerrar')
    }
  }

  const handleExportTranscript = () => {
    if (transcripts.length === 0) {
      toast.error('Não há transcrições para exportar')
      return
    }
    const text = transcripts
      .map((t, i) => `[${i + 1}] ${t.speaker_name}:\n${t.content}\n`)
      .join('\n---\n\n')
    
    const header = `# Transcrição: ${meeting?.title || 'Sessão'}\n# Data: ${new Date().toLocaleString('pt-BR')}\n# Tópico: ${meeting?.topic || '-'}\n# Total de falas: ${transcripts.length}\n\n${'='.repeat(60)}\n\n`

    const blob = new Blob([header + text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transcricao-${meeting?.title?.replace(/\s+/g, '-').toLowerCase() || 'sessao'}-${new Date().toISOString().split('T')[0]}.txt`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Transcrição exportada!')
  }

  const agents = meeting?.agents || []

  if (loading) {
    return (
      <div className="h-screen bg-surface-dark flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-400 mt-4">Carregando sessão...</p>
        </div>
      </div>
    )
  }

  if (!meeting) {
    return (
      <div className="h-screen bg-surface-dark flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 text-lg">Sessão não encontrada</p>
          <Button className="mt-4" onClick={() => navigate(ROUTES.MEETINGS)}>
            Voltar para Sessões
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-surface-dark flex flex-col">
      {/* Top Bar */}
      <div className="h-14 bg-surface-dark-alt border-b border-border-dark px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(ROUTES.MEETINGS)}
            className="text-gray-400 hover:text-white transition-colors"
            title="Voltar para lista de sessões"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-body-sm font-semibold text-white">{meeting.title}</h2>
            <div className="flex items-center gap-2">
              <Badge variant={meeting.status === 'in_progress' ? 'warning' : meeting.status === 'completed' ? 'success' : 'default'}>
                {meeting.status === 'in_progress' ? 'Em Andamento' : meeting.status === 'completed' ? 'Concluída' : meeting.status}
              </Badge>
              <span className="text-body-xs text-gray-400">{agents.length} agente(s)</span>
              <span className="text-body-xs text-gray-500">|</span>
              <span className="text-body-xs text-gray-400">{transcripts.length} fala(s)</span>
              {autoPlay && (
                <Badge variant="info">
                  <span className="animate-pulse mr-1">●</span> Auto-debate ligado
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="btn-icon text-gray-400 hover:text-white"
            title="Como funciona"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="btn-icon text-gray-400 hover:text-white"
            title="Configurações do auto-debate"
          >
            <Settings2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleExportTranscript}
            className="btn-icon text-gray-400 hover:text-white"
            title="Exportar transcrição"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className="btn-icon text-gray-400 hover:text-white"
            title={showTranscript ? 'Esconder transcrição' : 'Mostrar transcrição'}
          >
            {showTranscript ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Help Banner */}
      {showHelp && (
        <div className="bg-primary-900/90 border-b border-primary-700 px-6 py-3 text-body-sm text-primary-100 flex items-center gap-3 animate-fade-in">
          <Info className="w-5 h-5 text-primary-400 shrink-0" />
          <div>
            <strong>Como funciona:</strong> Use o botão <strong>▶ Auto-debate</strong> para os agentes conversarem automaticamente. 
            Ou clique em <strong>"Próximo turno"</strong> para controlar manualmente. 
            Configure o intervalo entre falas no ícone de engrenagem. 
            O <strong>botão vermelho</strong> encerra a sessão.
          </div>
          <button onClick={() => setShowHelp(false)} className="text-primary-300 hover:text-white shrink-0">✕</button>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-surface-dark-alt border-b border-border-dark px-6 py-4 animate-fade-in">
          <div className="flex items-center gap-6 max-w-2xl mx-auto">
            <div className="flex-1">
              <label className="text-body-xs text-gray-400 block mb-1">
                Intervalo entre turnos: <span className="text-primary-400 font-semibold">{autoDelay}s</span>
              </label>
              <input
                type="range"
                min="1"
                max="15"
                value={autoDelay}
                onChange={(e) => setAutoDelay(Number(e.target.value))}
                className="w-full accent-primary-500"
                disabled={autoPlay}
              />
              <div className="flex justify-between text-body-xs text-gray-500">
                <span>1s (rápido)</span>
                <span>15s (lento)</span>
              </div>
            </div>
            <div className="flex-1">
              <label className="text-body-xs text-gray-400 block mb-1">
                Limite de turnos: <span className="text-primary-400 font-semibold">{maxTurns}</span>
              </label>
              <input
                type="range"
                min="5"
                max="100"
                step="5"
                value={maxTurns}
                onChange={(e) => setMaxTurns(Number(e.target.value))}
                className="w-full accent-primary-500"
                disabled={autoPlay}
              />
              <div className="flex justify-between text-body-xs text-gray-500">
                <span>5 turnos</span>
                <span>100 turnos</span>
              </div>
            </div>
            <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-white">✕</button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Agent Grid */}
        <div className="flex-1 p-4">
          {agents.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Users className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                <p className="text-lg font-medium">Nenhum agente nesta sessão</p>
                <p className="text-body-sm text-gray-500 mt-1">Adicione agentes ao criar a sessão</p>
              </div>
            </div>
          ) : (
            <div className={`grid gap-4 h-full ${agents.length <= 2 ? 'grid-cols-2' : agents.length <= 4 ? 'grid-cols-2' : 'grid-cols-3'}`}>
              {agents.map((agent) => (
                <div
                  key={agent.agent_id}
                  className={`relative rounded-2xl overflow-hidden flex flex-col items-center justify-center transition-all duration-500
                    ${lastSpeaker === agent.agent_name
                      ? 'bg-gradient-to-b from-primary-900/50 to-surface-dark-alt ring-2 ring-primary-500 scale-[1.02]'
                      : 'bg-surface-dark-alt hover:bg-surface-dark-alt/80'
                    }`}
                >
                  {lastSpeaker === agent.agent_name && (
                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 bg-secondary-500 rounded-full animate-pulse" />
                      <span className="text-body-xs text-secondary-400 font-medium">Falou por último</span>
                    </div>
                  )}
                  {runningTurn && lastSpeaker !== agent.agent_name && autoPlay && (
                    <div className="absolute top-3 right-3">
                      <span className="text-body-xs text-gray-500">Aguardando...</span>
                    </div>
                  )}
                  <Avatar name={agent.agent_name} size="xl" status={lastSpeaker === agent.agent_name ? 'online' : undefined} />
                  <h3 className="text-body font-semibold text-white mt-3">{agent.agent_name}</h3>
                  <p className="text-body-xs text-gray-400">{agent.agent_role}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Transcript Panel */}
        {showTranscript && (
          <div className="w-96 bg-surface-dark-alt border-l border-border-dark flex flex-col">
            <div className="px-4 py-3 border-b border-border-dark flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-400" />
                <h3 className="text-body-sm font-semibold text-white">Transcrição</h3>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleExportTranscript}
                  className="text-gray-400 hover:text-white p-1 rounded"
                  title="Exportar transcrição como arquivo"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setShowTranscript(false)} className="text-gray-400 hover:text-white p-1 rounded">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {transcripts.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                  <p className="text-body-sm text-gray-400 font-medium">Nenhuma fala ainda</p>
                  <p className="text-body-xs text-gray-500 mt-1">
                    Clique em <strong>▶ Auto-debate</strong> para os agentes começarem a conversar
                  </p>
                </div>
              ) : (
                transcripts.map((t, idx) => (
                  <div
                    key={t.id || idx}
                    className={`border-l-2 pl-3 transition-all ${
                      idx === transcripts.length - 1 ? 'border-l-primary-500 bg-primary-900/10 rounded-r-lg p-3 -ml-1' : 'border-l-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Avatar name={t.speaker_name} size="xs" />
                      <span className="text-body-xs font-medium text-gray-300">{t.speaker_name}</span>
                      <span className="text-body-xs text-gray-600">#{t.sequence_number}</span>
                    </div>
                    <p className="text-body-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{t.content}</p>
                  </div>
                ))
              )}
              {runningTurn && (
                <div className="flex items-center gap-2 text-body-xs text-gray-500 animate-pulse">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Gerando resposta...
                </div>
              )}
              <div ref={transcriptEndRef} />
            </div>
          </div>
        )}
      </div>

      {/* Control Bar */}
      <div className="h-20 bg-surface-dark-alt border-t border-border-dark px-6 flex items-center justify-center gap-3 shrink-0">
        {meeting.status === 'in_progress' ? (
          <>
            {/* Auto-play button */}
            <button
              onClick={toggleAutoPlay}
              disabled={runningTurn && !autoPlay}
              className={`h-14 px-6 rounded-xl font-semibold text-body-sm flex items-center gap-2 transition-all ${
                autoPlay
                  ? 'bg-amber-500 hover:bg-amber-600 text-white'
                  : 'bg-primary-500 hover:bg-primary-600 text-white'
              } disabled:opacity-50`}
              title={autoPlay ? 'Pausar auto-debate' : 'Iniciar auto-debate — os agentes conversam automaticamente'}
            >
              {autoPlay ? (
                <>
                  <Pause className="w-5 h-5" />
                  {countdown > 0 ? `Próximo em ${countdown}s...` : runningTurn ? 'Gerando...' : 'Pausar'}
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Auto-debate
                </>
              )}
            </button>

            {/* Manual turn */}
            <Button
              variant="secondary"
              onClick={handleRunTurn}
              disabled={runningTurn || autoPlay}
              icon={<SkipForward className="w-4 h-4" />}
              title="Executar apenas um turno manualmente"
            >
              1 turno
            </Button>

            <div className="mx-1 h-8 w-px bg-border-dark" />

            {/* End meeting */}
            <button
              onClick={handleEndMeeting}
              className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white transition-colors"
              title="Encerrar sessão"
            >
              <Square className="w-4 h-4" />
            </button>

            {/* Toggle transcript */}
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400"
              onClick={() => setShowTranscript(!showTranscript)}
              title={showTranscript ? 'Esconder transcrição' : 'Mostrar transcrição'}
            >
              <MessageSquare className="w-5 h-5" />
            </Button>

            {/* Turn counter */}
            <span className="text-body-xs text-gray-500 ml-2">
              {transcripts.length}/{maxTurns} turnos
            </span>
          </>
        ) : (
          <div className="text-center">
            <p className="text-gray-400 text-body-sm">
              {meeting.status === 'completed' ? 'Esta sessão foi encerrada.' : `Status: ${meeting.status}`}
            </p>
            <div className="flex gap-3 mt-2">
              <Button variant="ghost" onClick={() => navigate(ROUTES.MEETINGS)}>
                <ArrowLeft className="w-4 h-4" /> Voltar
              </Button>
              <Button variant="secondary" onClick={handleExportTranscript} icon={<Download className="w-4 h-4" />}>
                Exportar Transcrição
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
