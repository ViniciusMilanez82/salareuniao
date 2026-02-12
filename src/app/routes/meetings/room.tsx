import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ROUTES } from '@/config/routes'
import { fetchMeeting, runMeetingTurn, endMeeting } from '@/lib/api/meetings'
import {
  Play, Pause, Square, MicOff, MessageSquare, ChevronRight, ArrowLeft,
  Hand, SkipForward, Users, FileText, Settings,
  Maximize, Minimize, Zap
} from 'lucide-react'
import toast from 'react-hot-toast'

type AgentRow = { agent_id: string; agent_name: string; agent_role: string }
type TranscriptRow = { id: string; speaker_name: string; content: string; sequence_number: number }

export default function MeetingRoomPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [meeting, setMeeting] = useState<{ title: string; status: string; agents?: AgentRow[] } | null>(null)
  const [transcripts, setTranscripts] = useState<TranscriptRow[]>([])
  const [loading, setLoading] = useState(true)
  const [runningTurn, setRunningTurn] = useState(false)
  const [isPlaying, setIsPlaying] = useState(true)
  const [showTranscript, setShowTranscript] = useState(true)
  const [lastSpeaker, setLastSpeaker] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    fetchMeeting(id)
      .then((data: any) => {
        setMeeting(data)
        setTranscripts(data.transcripts || [])
      })
      .catch(() => toast.error('Erro ao carregar sessão'))
      .finally(() => setLoading(false))
  }, [id])

  const refreshTranscripts = () => {
    if (!id) return
    fetchMeeting(id).then((data: any) => setTranscripts(data.transcripts || []))
  }

  const handleRunTurn = async () => {
    if (!id || runningTurn) return
    setRunningTurn(true)
    try {
      await runMeetingTurn(id, 'openai')
      toast.success('Turno executado')
      refreshTranscripts()
      const data = await fetchMeeting(id) as any
      const last = (data.transcripts || []).slice(-1)[0]
      if (last) setLastSpeaker(last.speaker_name)
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao executar turno')
    } finally {
      setRunningTurn(false)
    }
  }

  const handleEndMeeting = async () => {
    if (!id) return
    try {
      await endMeeting(id)
      toast.success('Sessão encerrada')
      navigate(ROUTES.MEETINGS)
    } catch (err: any) {
      toast.error('Erro ao encerrar')
    }
  }

  const agents = meeting?.agents || []
  const sentimentColors: Record<string, string> = {
    positive: 'border-l-secondary-500',
    negative: 'border-l-red-500',
    neutral: 'border-l-gray-400',
  }

  if (loading) {
    return (
      <div className="h-screen bg-surface-dark flex items-center justify-center">
        <p className="text-gray-400">Carregando sessão...</p>
      </div>
    )
  }

  if (!meeting) {
    return (
      <div className="h-screen bg-surface-dark flex items-center justify-center">
        <p className="text-gray-400">Sessão não encontrada</p>
      </div>
    )
  }

  return (
    <div className="h-screen bg-surface-dark flex flex-col">
      {/* Top Bar */}
      <div className="h-14 bg-surface-dark-alt border-b border-border-dark px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(ROUTES.MEETINGS)} className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-body-sm font-semibold text-white">{meeting.title}</h2>
            <div className="flex items-center gap-2">
              <Badge variant={meeting.status === 'in_progress' ? 'warning' : 'success'}>
                {meeting.status === 'in_progress' ? 'Em Andamento' : meeting.status}
              </Badge>
              <span className="text-body-xs text-gray-400">{agents.length} agentes</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="text-gray-400">
            <Users className="w-4 h-4" /> {agents.length} agentes
          </Button>
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className="btn-icon text-gray-400 hover:text-white"
          >
            {showTranscript ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Agent Grid */}
        <div className="flex-1 p-4">
          <div className="grid grid-cols-2 gap-4 h-full">
            {agents.length === 0 ? (
              <div className="col-span-2 flex items-center justify-center text-gray-500">
                Nenhum agente nesta sessão
              </div>
            ) : (
              agents.map((agent) => (
                <div
                  key={agent.agent_id}
                  className={`relative rounded-2xl overflow-hidden flex flex-col items-center justify-center transition-all duration-300
                    ${lastSpeaker === agent.agent_name
                      ? 'bg-gradient-to-b from-primary-900/50 to-surface-dark-alt ring-2 ring-primary-500'
                      : 'bg-surface-dark-alt'
                    }`}
                >
                  {lastSpeaker === agent.agent_name && (
                    <div className="absolute top-3 left-3">
                      <span className="w-2 h-2 bg-secondary-500 rounded-full animate-pulse inline-block mr-1.5" />
                      <span className="text-body-xs text-secondary-400 font-medium">Falou agora</span>
                    </div>
                  )}
                  <Avatar name={agent.agent_name} size="xl" status="online" />
                  <h3 className="text-body font-semibold text-white mt-3">{agent.agent_name}</h3>
                  <p className="text-body-xs text-gray-400">{agent.agent_role}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Transcript Panel */}
        {showTranscript && (
          <div className="w-96 bg-surface-dark-alt border-l border-border-dark flex flex-col">
            <div className="px-4 py-3 border-b border-border-dark flex items-center justify-between">
              <h3 className="text-body-sm font-semibold text-white">Transcrição</h3>
              <button onClick={() => setShowTranscript(false)} className="text-gray-400 hover:text-white">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {transcripts.length === 0 ? (
                <p className="text-body-sm text-gray-500">Nenhuma fala ainda. Clique em &quot;Próximo turno&quot; para iniciar o debate.</p>
              ) : (
                transcripts.map((t) => (
                  <div key={t.id} className={`border-l-2 pl-3 ${sentimentColors.neutral}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <Avatar name={t.speaker_name} size="xs" />
                      <span className="text-body-xs font-medium text-gray-300">{t.speaker_name}</span>
                    </div>
                    <p className="text-body-sm text-gray-300 whitespace-pre-wrap">{t.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Control Bar */}
      <div className="h-20 bg-surface-dark-alt border-t border-border-dark px-6 flex items-center justify-center gap-4 shrink-0">
        <Button
          size="lg"
          onClick={handleRunTurn}
          disabled={runningTurn || meeting.status !== 'in_progress'}
          icon={<Zap className="w-5 h-5" />}
        >
          {runningTurn ? 'Gerando...' : 'Próximo turno (IA)'}
        </Button>
        <div className="mx-2 h-8 w-px bg-border-dark" />
        <button
          onClick={handleEndMeeting}
          className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white transition-colors"
        >
          <Square className="w-5 h-5" />
        </button>
        <Button variant="ghost" size="sm" className="text-gray-400" onClick={() => setShowTranscript(!showTranscript)}>
          <MessageSquare className="w-5 h-5" />
        </Button>
      </div>
    </div>
  )
}
