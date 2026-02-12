import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ROUTES } from '@/config/routes'
import {
  Play, Pause, Square, Mic, MicOff, Volume2, VolumeX,
  MessageSquare, Send, ChevronRight, ArrowLeft,
  Hand, SkipForward, Users, FileText, Settings,
  Maximize, Minimize
} from 'lucide-react'

const mockAgents = [
  { id: '1', name: 'Analista Financeiro', role: 'Finanças', speaking: true, muted: false },
  { id: '2', name: 'Advogado Cético', role: 'Jurídico', speaking: false, muted: false },
  { id: '3', name: 'Estrategista de Mkt', role: 'Marketing', speaking: false, muted: false },
  { id: '4', name: 'Especialista em Dados', role: 'Data Science', speaking: false, muted: true },
]

const mockTranscripts = [
  { id: 1, speaker: 'Analista Financeiro', content: 'Analisando os números do último trimestre, vejo uma tendência de crescimento de 15% nas receitas recorrentes, mas precisamos considerar o impacto da inflação nos custos operacionais.', time: '10:03', sentiment: 'positive' },
  { id: 2, speaker: 'Advogado Cético', content: 'Concordo com a análise, mas preciso apontar que existem riscos regulatórios significativos no mercado europeu que podem impactar essa projeção em até 8%.', time: '10:04', sentiment: 'neutral' },
  { id: 3, speaker: 'Estrategista de Mkt', content: 'Do ponto de vista de marca, a expansão para Europa abre oportunidades enormes. Nosso awareness lá é praticamente zero, o que é tanto um desafio quanto uma tela em branco para posicionamento.', time: '10:06', sentiment: 'positive' },
  { id: 4, speaker: 'Analista Financeiro', content: 'Considerando os pontos levantados, sugiro que criemos três cenários: otimista, base e pessimista, cada um com diferentes premissas para os riscos regulatórios mencionados.', time: '10:08', sentiment: 'neutral' },
]

export default function MeetingRoomPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [isPlaying, setIsPlaying] = useState(true)
  const [showTranscript, setShowTranscript] = useState(true)
  const [moderatorMessage, setModeratorMessage] = useState('')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [elapsedTime, setElapsedTime] = useState('00:08:32')

  const sentimentColors: Record<string, string> = {
    positive: 'border-l-secondary-500',
    negative: 'border-l-red-500',
    neutral: 'border-l-gray-400',
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
            <h2 className="text-body-sm font-semibold text-white">Análise de Impacto da Fusão ABC</h2>
            <div className="flex items-center gap-2">
              <Badge variant="warning">Em Andamento</Badge>
              <span className="text-body-xs text-gray-400">{elapsedTime}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="text-gray-400">
            <Users className="w-4 h-4" /> 4 agentes
          </Button>
          <Button variant="ghost" size="sm" className="text-gray-400">
            <FileText className="w-4 h-4" /> Docs
          </Button>
          <Button variant="ghost" size="sm" className="text-gray-400">
            <Settings className="w-4 h-4" />
          </Button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="btn-icon text-gray-400 hover:text-white"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Agent Grid */}
        <div className={`flex-1 p-4 ${showTranscript ? '' : ''}`}>
          <div className="grid grid-cols-2 gap-4 h-full">
            {mockAgents.map((agent) => (
              <div
                key={agent.id}
                className={`relative rounded-2xl overflow-hidden flex flex-col items-center justify-center
                  ${agent.speaking
                    ? 'bg-gradient-to-b from-primary-900/50 to-surface-dark-alt ring-2 ring-primary-500'
                    : 'bg-surface-dark-alt'
                  } transition-all duration-300`}
              >
                {/* Speaking indicator */}
                {agent.speaking && (
                  <div className="absolute top-3 left-3">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-secondary-500 rounded-full animate-pulse" />
                      <span className="text-body-xs text-secondary-400 font-medium">Falando</span>
                    </div>
                  </div>
                )}

                {/* Mute indicator */}
                {agent.muted && (
                  <div className="absolute top-3 right-3">
                    <MicOff className="w-4 h-4 text-red-500" />
                  </div>
                )}

                <Avatar
                  name={agent.name}
                  size="xl"
                  status={agent.speaking ? 'speaking' : agent.muted ? 'muted' : 'online'}
                />
                <h3 className="text-body font-semibold text-white mt-3">{agent.name}</h3>
                <p className="text-body-xs text-gray-400">{agent.role}</p>

                {/* Audio bars animation */}
                {agent.speaking && (
                  <div className="flex items-end gap-0.5 mt-2 h-4">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className="w-1 bg-primary-400 rounded-full animate-pulse"
                        style={{
                          height: `${Math.random() * 16 + 4}px`,
                          animationDelay: `${i * 0.1}s`,
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Transcript Panel */}
        {showTranscript && (
          <div className="w-96 bg-surface-dark-alt border-l border-border-dark flex flex-col">
            <div className="px-4 py-3 border-b border-border-dark flex items-center justify-between">
              <h3 className="text-body-sm font-semibold text-white">Transcrição ao Vivo</h3>
              <button onClick={() => setShowTranscript(false)} className="text-gray-400 hover:text-white">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {mockTranscripts.map((t) => (
                <div key={t.id} className={`border-l-2 pl-3 ${sentimentColors[t.sentiment]}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Avatar name={t.speaker} size="xs" />
                    <span className="text-body-xs font-medium text-gray-300">{t.speaker}</span>
                    <span className="text-body-xs text-gray-500">{t.time}</span>
                  </div>
                  <p className="text-body-sm text-gray-300">{t.content}</p>
                </div>
              ))}
            </div>

            {/* Moderator Input */}
            <div className="p-3 border-t border-border-dark">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Intervenção do moderador..."
                  value={moderatorMessage}
                  onChange={(e) => setModeratorMessage(e.target.value)}
                  className="flex-1 h-9 px-3 rounded-lg bg-surface-dark border border-border-dark text-body-sm text-white placeholder:text-gray-500 focus:border-primary-500 focus:outline-none"
                />
                <button className="w-9 h-9 rounded-lg bg-primary-500 flex items-center justify-center text-white hover:bg-primary-600 transition-colors">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Control Bar */}
      <div className="h-20 bg-surface-dark-alt border-t border-border-dark px-6 flex items-center justify-center gap-4 shrink-0">
        <Button variant="ghost" size="sm" className="text-gray-400 hover:text-accent-500">
          <Hand className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="sm" className="text-gray-400">
          <SkipForward className="w-5 h-5" />
        </Button>
        <div className="mx-2 h-8 w-px bg-border-dark" />
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
            isPlaying ? 'bg-accent-500 hover:bg-accent-600' : 'bg-primary-500 hover:bg-primary-600'
          } text-white`}
        >
          {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
        </button>
        <button className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white transition-colors">
          <Square className="w-5 h-5" />
        </button>
        <div className="mx-2 h-8 w-px bg-border-dark" />
        <Button variant="ghost" size="sm" className="text-gray-400" onClick={() => setShowTranscript(!showTranscript)}>
          <MessageSquare className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="sm" className="text-gray-400">
          <Volume2 className="w-5 h-5" />
        </Button>
      </div>
    </div>
  )
}
