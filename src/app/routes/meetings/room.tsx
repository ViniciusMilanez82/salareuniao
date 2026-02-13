import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ROUTES } from '@/config/routes'
import { fetchMeeting, runMeetingTurn, endMeeting, addTranscript, getMeetingFeedback, setTranscriptFeedback } from '@/lib/api/meetings'
import { connectMeetingRoom, disconnectMeetingRoom } from '@/lib/supabase/realtime'
import { useAuthStore } from '@/stores/useAuthStore'
import {
  Play, Pause, Square, MessageSquare, ChevronRight, ArrowLeft,
  SkipForward, Users, FileText, Download, Send, Mic, MicOff, User,
  Maximize, Minimize, Zap, HelpCircle, Info, Settings2, Loader2,
  Volume2, VolumeX, ThumbsUp, ThumbsDown
} from 'lucide-react'
import toast from 'react-hot-toast'

type AgentRow = { agent_id: string; agent_name: string; agent_role: string; agent_avatar?: string }
type TranscriptRow = { id: string; speaker_name: string; content: string; sequence_number: number; speaker_type?: string }

// ============================================================
// TTS Engine — fora do React para evitar problemas de closure
// ============================================================
class TTSEngine {
  enabled = false
  speaking = false
  queue: { name: string; text: string }[] = []
  voices: SpeechSynthesisVoice[] = []
  onStateChange: (speaking: boolean) => void = () => {}
  private resumeTimer: ReturnType<typeof setInterval> | null = null

  constructor() {
    // Carregar vozes (assíncrono em Chrome)
    this.loadVoices()
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.addEventListener('voiceschanged', () => this.loadVoices())
    }
  }

  private loadVoices() {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    this.voices = window.speechSynthesis.getVoices()
  }

  getVoiceForAgent(agentName: string): SpeechSynthesisVoice | undefined {
    const ptVoices = this.voices.filter(v => v.lang.startsWith('pt'))
    const pool = ptVoices.length > 0 ? ptVoices : this.voices
    if (pool.length === 0) return undefined
    const hash = agentName.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
    return pool[hash % pool.length]
  }

  // "Unlock" — browsers exigem gesto do usuário antes de falar
  unlock() {
    if (!window.speechSynthesis) return
    const u = new SpeechSynthesisUtterance('')
    u.volume = 0
    window.speechSynthesis.speak(u)
  }

  enable() {
    this.enabled = true
    this.unlock()
  }

  disable() {
    this.enabled = false
    this.queue = []
    this.speaking = false
    this.stopResumeTimer()
    window.speechSynthesis?.cancel()
    this.onStateChange(false)
  }

  enqueue(agentName: string, text: string) {
    if (!this.enabled) return
    this.queue.push({ name: agentName, text })
    if (!this.speaking) this.processNext()
  }

  stop() {
    this.queue = []
    this.speaking = false
    this.stopResumeTimer()
    window.speechSynthesis?.cancel()
    this.onStateChange(false)
  }

  private processNext() {
    if (!this.enabled || this.queue.length === 0) {
      this.speaking = false
      this.onStateChange(false)
      return
    }

    const item = this.queue.shift()!
    this.speakItem(item.name, item.text)
  }

  private speakItem(agentName: string, rawText: string) {
    if (!window.speechSynthesis) return

    // Limpar texto
    const text = rawText
      .replace(/\[.*?\]/g, '')
      .replace(/\n+/g, '. ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 600)

    if (!text) {
      this.processNext()
      return
    }

    // Quebrar em sentenças (Chrome trava em textos > ~200 chars)
    const sentences = text.match(/[^.!?]+[.!?]*/g) || [text]

    // Falar cada sentença em sequência
    const speakSentences = (idx: number) => {
      if (idx >= sentences.length || !this.enabled) {
        this.speaking = false
        this.stopResumeTimer()
        this.onStateChange(false)
        // Próximo da fila
        setTimeout(() => this.processNext(), 100)
        return
      }

      const sentence = sentences[idx].trim()
      if (!sentence) {
        speakSentences(idx + 1)
        return
      }

      const utterance = new SpeechSynthesisUtterance(sentence)
      const voice = this.getVoiceForAgent(agentName)
      if (voice) utterance.voice = voice
      utterance.lang = 'pt-BR'
      utterance.rate = 1.1
      utterance.pitch = 1.0
      utterance.volume = 1.0

      utterance.onstart = () => {
        this.speaking = true
        this.onStateChange(true)
        // Workaround Chrome: resume a cada 10s para não pausar
        this.startResumeTimer()
      }

      utterance.onend = () => {
        this.stopResumeTimer()
        speakSentences(idx + 1)
      }

      utterance.onerror = (e) => {
        console.warn('TTS erro:', e.error)
        this.stopResumeTimer()
        // Se for 'interrupted' e voz desligada, parar
        if (!this.enabled) return
        speakSentences(idx + 1)
      }

      window.speechSynthesis.cancel() // Limpar qualquer utterance pendente
      window.speechSynthesis.speak(utterance)
    }

    this.speaking = true
    this.onStateChange(true)
    speakSentences(0)
  }

  // Workaround Chrome: speechSynthesis pausa sozinho após ~15s
  private startResumeTimer() {
    this.stopResumeTimer()
    this.resumeTimer = setInterval(() => {
      if (window.speechSynthesis?.speaking) {
        window.speechSynthesis.pause()
        window.speechSynthesis.resume()
      }
    }, 10_000)
  }

  private stopResumeTimer() {
    if (this.resumeTimer) {
      clearInterval(this.resumeTimer)
      this.resumeTimer = null
    }
  }

  /** Retorna uma Promise que resolve quando a fila esvaziar e a fala acabar */
  waitUntilDone(): Promise<void> {
    if (!this.enabled || (!this.speaking && this.queue.length === 0)) {
      return Promise.resolve()
    }
    return new Promise((resolve) => {
      const check = () => {
        if (!this.enabled || (!this.speaking && this.queue.length === 0)) {
          resolve()
        } else {
          setTimeout(check, 200)
        }
      }
      check()
    })
  }

  destroy() {
    this.disable()
  }
}

export default function MeetingRoomPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { user } = useAuthStore()
  const [meeting, setMeeting] = useState<{ title: string; status: string; topic?: string; agents?: AgentRow[] } | null>(null)
  const [transcripts, setTranscripts] = useState<TranscriptRow[]>([])
  const [loading, setLoading] = useState(true)
  const [runningTurn, setRunningTurn] = useState(false)
  const [showTranscript, setShowTranscript] = useState(true)
  const [lastSpeaker, setLastSpeaker] = useState<string | null>(null)
  const [showHelp, setShowHelp] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [feedbackMap, setFeedbackMap] = useState<Record<string, number>>({})
  const [socketReconnecting, setSocketReconnecting] = useState(false)
  const transcriptEndRef = useRef<HTMLDivElement>(null)

  // === CHAT HUMANO ===
  const [chatMessage, setChatMessage] = useState('')
  const [sendingChat, setSendingChat] = useState(false)
  const chatInputRef = useRef<HTMLInputElement>(null)

  // === SPEECH-TO-TEXT (STT) ===
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<any>(null)
  const sttSupported = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  // === AUTO-PLAY ===
  const [autoPlay, setAutoPlay] = useState(false)
  const [autoDelay, setAutoDelay] = useState(3) // segundos entre turnos
  const [maxTurns, setMaxTurns] = useState(20) // limite de turnos automáticos
  const [turnsExecuted, setTurnsExecuted] = useState(0)
  const [countdown, setCountdown] = useState(0)
  const autoPlayRef = useRef(false)
  const countdownRef = useRef<ReturnType<typeof setInterval>>()
  const abortRef = useRef(false)

  // === VOZ (TTS) ===
  const [voiceEnabled, setVoiceEnabled] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const ttsRef = useRef<TTSEngine | null>(null)

  // Inicializar TTS engine uma vez
  useEffect(() => {
    const engine = new TTSEngine()
    engine.onStateChange = (speaking) => setIsSpeaking(speaking)
    ttsRef.current = engine
    return () => { engine.destroy(); ttsRef.current = null }
  }, [])

  // Toggle voz — DEVE ser em handler de click (gesto do usuário)
  const toggleVoice = useCallback(() => {
    const tts = ttsRef.current
    if (!tts) return
    if (voiceEnabled) {
      tts.disable()
      setVoiceEnabled(false)
      setIsSpeaking(false)
      toast.success('Voz desligada')
    } else {
      tts.enable()
      setVoiceEnabled(true)
      toast.success('Voz ativada! As próximas falas serão lidas em voz alta.')
    }
  }, [voiceEnabled])

  // === Enviar mensagem humana ===
  const handleSendChat = useCallback(async () => {
    const text = chatMessage.trim()
    if (!text || !id || sendingChat) return
    setSendingChat(true)
    try {
      await addTranscript(id, {
        speaker_type: 'human',
        speaker_name: user?.name || 'Participante',
        content: text,
        content_type: 'speech',
      } as any)
      setChatMessage('')
      await refreshTranscripts()
      scrollToBottom()
    } catch {
      toast.error('Erro ao enviar mensagem')
    } finally {
      setSendingChat(false)
      chatInputRef.current?.focus()
    }
  }, [chatMessage, id, sendingChat, user?.name]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleChatKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendChat()
    }
  }

  // === Speech-to-Text ===
  const toggleListening = useCallback(() => {
    if (isListening) {
      // Parar
      recognitionRef.current?.stop()
      setIsListening(false)
      return
    }
    if (!sttSupported) {
      toast.error('Seu navegador não suporta reconhecimento de voz')
      return
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.lang = 'pt-BR'
    recognition.interimResults = true
    recognition.continuous = false

    let finalTranscript = ''

    recognition.onstart = () => setIsListening(true)

    recognition.onresult = (event: any) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript
        } else {
          interim = transcript
        }
      }
      setChatMessage(finalTranscript || interim)
    }

    recognition.onend = () => {
      setIsListening(false)
      if (finalTranscript.trim()) {
        setChatMessage(finalTranscript.trim())
      }
    }

    recognition.onerror = (e: any) => {
      console.warn('STT erro:', e.error)
      setIsListening(false)
      if (e.error === 'not-allowed') {
        toast.error('Permissão de microfone negada. Permita o acesso nas configurações do navegador.')
      }
    }

    recognitionRef.current = recognition
    recognition.start()
  }, [isListening, sttSupported])

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

    getMeetingFeedback(id).then(setFeedbackMap).catch(() => {})

    try {
      connectMeetingRoom(id, {
        onTranscript: (data: any) => {
          setTranscripts((prev) => {
            const exists = prev.find(t => t.sequence_number === data.sequence_number)
            if (exists) return prev
            return [...prev, data]
          })
          ttsRef.current?.enqueue(data.speaker_name, data.content)
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
        onDisconnect: () => setSocketReconnecting(true),
        onReconnect: () => setSocketReconnecting(false),
      })
      setSocketReconnecting(false)
    } catch {
      console.log('WebSocket não disponível, usando polling')
    }

    return () => {
      disconnectMeetingRoom()
      autoPlayRef.current = false
      abortRef.current = true
      if (countdownRef.current) clearInterval(countdownRef.current)
      ttsRef.current?.stop()
    }
  }, [id, scrollToBottom])

  // Scroll ao carregar transcripts
  useEffect(() => {
    scrollToBottom()
  }, [transcripts.length, scrollToBottom])

  const prevTranscriptCountRef = useRef(0)

  const refreshTranscripts = async () => {
    if (!id) return
    try {
      const data = await fetchMeeting(id) as any
      const newTranscripts = data.transcripts || []
      // Falar novas mensagens via TTS
      if (newTranscripts.length > prevTranscriptCountRef.current) {
        const newOnes = newTranscripts.slice(prevTranscriptCountRef.current)
        for (const t of newOnes) {
          ttsRef.current?.enqueue(t.speaker_name, t.content)
        }
      }
      prevTranscriptCountRef.current = newTranscripts.length
      setTranscripts(newTranscripts)
      const last = newTranscripts.slice(-1)[0]
      if (last) setLastSpeaker(last.speaker_name)
      return newTranscripts
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
      if (msg.includes('API key') || msg.includes('não configurada')) {
        toast.error('API da OpenAI não configurada. Vá em Admin > Integrações para configurar.')
      } else if (msg.includes('429') || msg.includes('Muitas requisições')) {
        toast.error('Muitas requisições. Aguarde um minuto e tente novamente.')
      } else {
        toast.error('Nossos agentes estão temporariamente indisponíveis. Tente novamente em instantes.')
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

        // Executar turno
        const success = await executeTurn()
        if (!success) {
          setAutoPlay(false)
          autoPlayRef.current = false
          break
        }

        // Esperar TTS terminar de falar antes do próximo turno
        if (ttsRef.current?.enabled) {
          await ttsRef.current.waitUntilDone()
        }

        if (!autoPlayRef.current || abortRef.current) break

        // Countdown antes do próximo turno
        setCountdown(autoDelay)
        for (let i = autoDelay; i > 0; i--) {
          if (!autoPlayRef.current || abortRef.current) break
          setCountdown(i)
          await new Promise((r) => setTimeout(r, 1000))
        }
        setCountdown(0)

        if (!autoPlayRef.current || abortRef.current) break
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
      {/* Banner reconectando Socket */}
      {socketReconnecting && (
        <div className="bg-amber-900/80 border-b border-amber-700 px-4 py-2 text-body-sm text-amber-100 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden />
          Reconectando...
        </div>
      )}

      <div className="h-14 bg-surface-dark-alt border-b border-border-dark px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(ROUTES.MEETINGS)}
            className="text-gray-400 hover:text-white transition-colors"
            title="Voltar para lista de sessões"
            aria-label="Voltar para lista de sessões"
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
              {voiceEnabled && (
                <Badge variant="success">
                  <Volume2 className="w-3 h-3 inline mr-1" /> Voz ativa
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
            aria-label="Como funciona"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="btn-icon text-gray-400 hover:text-white"
            title="Configurações do auto-debate"
            aria-label="Configurações do auto-debate"
          >
            <Settings2 className="w-4 h-4" />
          </button>
          <button
            onClick={toggleVoice}
            className={`btn-icon transition-colors ${voiceEnabled ? 'text-secondary-400 hover:text-secondary-300' : 'text-gray-400 hover:text-white'}`}
            title={voiceEnabled ? 'Desligar voz (TTS está ativo)' : 'Ligar voz (os agentes falarão em voz alta)'}
            aria-label={voiceEnabled ? 'Desligar voz' : 'Ligar voz'}
          >
            {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <button
            onClick={handleExportTranscript}
            className="btn-icon text-gray-400 hover:text-white"
            title="Exportar transcrição"
            aria-label="Exportar transcrição"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className="btn-icon text-gray-400 hover:text-white"
            title={showTranscript ? 'Esconder transcrição' : 'Mostrar transcrição'}
            aria-label={showTranscript ? 'Esconder transcrição' : 'Mostrar transcrição'}
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
            <strong>Como funciona:</strong> Digite no campo de texto ou clique no <strong>microfone</strong> para participar do debate com sua voz.
            Use <strong>▶ Auto-debate</strong> para os agentes conversarem automaticamente, ou <strong>"1 turno"</strong> para controle manual.
            Ative o <strong>ícone de som</strong> para ouvir os agentes em voz alta (o próximo turno espera a fala terminar).
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
                      <span className="text-body-xs text-secondary-400 font-medium">
                        {isSpeaking && voiceEnabled ? 'Falando...' : 'Falou por último'}
                      </span>
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
                transcripts.map((t, idx) => {
                  const isHuman = t.speaker_type === 'human'
                  const isLast = idx === transcripts.length - 1
                  const myRating = t.id ? feedbackMap[t.id] : undefined
                  const handleFeedback = (rating: 1 | -1) => {
                    if (!id || !t.id) return
                    setTranscriptFeedback(id, t.id, rating)
                      .then(() => setFeedbackMap((prev) => ({ ...prev, [t.id!]: rating })))
                      .catch(() => toast.error('Erro ao enviar feedback'))
                  }
                  return (
                    <div
                      key={t.id || idx}
                      className={`border-l-2 pl-3 transition-all ${
                        isHuman
                          ? (isLast ? 'border-l-blue-400 bg-blue-900/15 rounded-r-lg p-3 -ml-1' : 'border-l-blue-500/60')
                          : (isLast ? 'border-l-primary-500 bg-primary-900/10 rounded-r-lg p-3 -ml-1' : 'border-l-gray-600')
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {isHuman ? (
                          <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center">
                            <User className="w-3 h-3 text-blue-400" />
                          </div>
                        ) : (
                          <Avatar name={t.speaker_name} size="xs" />
                        )}
                        <span className={`text-body-xs font-medium ${isHuman ? 'text-blue-300' : 'text-gray-300'}`}>
                          {t.speaker_name}
                          {isHuman && <span className="ml-1 text-blue-400/60">(você)</span>}
                        </span>
                        <span className="text-body-xs text-gray-600">#{t.sequence_number}</span>
                        {!isHuman && t.id && (
                          <span className="ml-auto flex items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => handleFeedback(1)}
                              className={`p-1 rounded ${myRating === 1 ? 'text-primary-400 bg-primary-900/30' : 'text-gray-500 hover:text-gray-300'}`}
                              aria-label="Curtir esta fala"
                            >
                              <ThumbsUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleFeedback(-1)}
                              className={`p-1 rounded ${myRating === -1 ? 'text-red-400 bg-red-900/30' : 'text-gray-500 hover:text-gray-300'}`}
                              aria-label="Não curtir esta fala"
                            >
                              <ThumbsDown className="w-3.5 h-3.5" />
                            </button>
                          </span>
                        )}
                      </div>
                      <p className="text-body-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{t.content}</p>
                    </div>
                  )
                })
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
      <div className="bg-surface-dark-alt border-t border-border-dark px-4 py-3 shrink-0">
        {meeting.status === 'in_progress' ? (
          <div className="flex flex-col gap-2">
            {/* Linha 1: Chat input */}
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <input
                  ref={chatInputRef}
                  type="text"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyDown={handleChatKeyDown}
                  placeholder={isListening ? 'Ouvindo... fale agora' : 'Digite sua mensagem para o debate...'}
                  disabled={sendingChat}
                  className={`w-full h-10 pl-4 pr-20 rounded-xl bg-surface-dark border text-body-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all ${
                    isListening ? 'border-red-500 focus:ring-red-500/30 animate-pulse' : 'border-border-dark focus:ring-primary-500/30'
                  }`}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {/* Mic button */}
                  {sttSupported && (
                    <button
                      onClick={toggleListening}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                        isListening
                          ? 'bg-red-500 text-white animate-pulse'
                          : 'text-gray-400 hover:text-white hover:bg-gray-700'
                      }`}
                      title={isListening ? 'Parar gravação' : 'Falar por voz (speech-to-text)'}
                    >
                      {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                    </button>
                  )}
                  {/* Send button */}
                  <button
                    onClick={handleSendChat}
                    disabled={!chatMessage.trim() || sendingChat}
                    className="w-7 h-7 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-30 disabled:hover:bg-blue-500 flex items-center justify-center text-white transition-colors"
                    title="Enviar mensagem"
                  >
                    {sendingChat ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Linha 2: Controles do debate */}
            <div className="flex items-center justify-center gap-2">
              {/* Auto-play button */}
              <button
                onClick={toggleAutoPlay}
                disabled={runningTurn && !autoPlay}
                className={`h-10 px-5 rounded-xl font-semibold text-body-xs flex items-center gap-2 transition-all ${
                  autoPlay
                    ? 'bg-amber-500 hover:bg-amber-600 text-white'
                    : 'bg-primary-500 hover:bg-primary-600 text-white'
                } disabled:opacity-50`}
                title={autoPlay ? 'Pausar auto-debate' : 'Iniciar auto-debate'}
              >
                {autoPlay ? (
                  <>
                    <Pause className="w-4 h-4" />
                    {countdown > 0 ? `${countdown}s...` : runningTurn ? 'Gerando...' : 'Pausar'}
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Auto-debate
                  </>
                )}
              </button>

              {/* Manual turn */}
              <Button
                variant="secondary"
                size="sm"
                onClick={handleRunTurn}
                disabled={runningTurn || autoPlay}
                icon={<SkipForward className="w-3.5 h-3.5" />}
                title="Executar apenas um turno manualmente"
              >
                1 turno
              </Button>

              <div className="mx-1 h-6 w-px bg-border-dark" />

              {/* End meeting */}
              <button
                onClick={handleEndMeeting}
                className="w-10 h-10 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white transition-colors"
                title="Encerrar sessão"
              >
                <Square className="w-3.5 h-3.5" />
              </button>

              {/* Toggle transcript */}
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400"
                onClick={() => setShowTranscript(!showTranscript)}
                title={showTranscript ? 'Esconder transcrição' : 'Mostrar transcrição'}
              >
                <MessageSquare className="w-4 h-4" />
              </Button>

              {/* Turn counter */}
              <span className="text-body-xs text-gray-500">
                {transcripts.length}/{maxTurns}
              </span>

              {/* Speaking indicator */}
              {isSpeaking && voiceEnabled && (
                <span className="text-body-xs text-secondary-400 flex items-center gap-1">
                  <Volume2 className="w-3 h-3 animate-pulse" /> Falando...
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-2">
            <p className="text-gray-400 text-body-sm">
              {meeting.status === 'completed' ? 'Esta sessão foi encerrada.' : `Status: ${meeting.status}`}
            </p>
            <div className="flex gap-3 mt-2 justify-center">
              <Button variant="ghost" size="sm" onClick={() => navigate(ROUTES.MEETINGS)}>
                <ArrowLeft className="w-4 h-4" /> Voltar
              </Button>
              <Button variant="secondary" size="sm" onClick={handleExportTranscript} icon={<Download className="w-4 h-4" />}>
                Exportar
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
