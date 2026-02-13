import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/useAuthStore'
import { fetchMeetings, fetchMeeting } from '@/lib/api/meetings'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  Search, Calendar, Clock, Bot, FileText, Download, Play,
  FolderArchive, ArrowRight, HelpCircle, Info
} from 'lucide-react'
import toast from 'react-hot-toast'

type ArchiveItem = {
  id: string
  title: string
  topic?: string | null
  scheduled_start: string | null
  actual_start?: string | null
  duration_minutes: number | null
  agent_count?: number
  tags: string[]
  summary?: string | null
}

export default function SessionArchivePage() {
  const [search, setSearch] = useState('')
  const [sessions, setSessions] = useState<ArchiveItem[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState<string | null>(null)
  const [exportingAll, setExportingAll] = useState(false)
  const { workspace } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (!workspace?.id) {
      setLoading(false)
      return
    }
    fetchMeetings(workspace.id, 'completed')
      .then((data) => setSessions((data as ArchiveItem[]) || []))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false))
  }, [workspace?.id])

  const filtered = sessions.filter((s) =>
    s.title?.toLowerCase().includes(search.toLowerCase()) ||
    s.topic?.toLowerCase().includes(search.toLowerCase())
  )

  const formatDuration = (min: number | null) => {
    if (!min) return '—'
    if (min >= 60) return `${Math.floor(min / 60)}h ${min % 60}min`
    return `${min}min`
  }

  const exportSession = async (sessionId: string, sessionTitle: string) => {
    setExporting(sessionId)
    try {
      const data = await fetchMeeting(sessionId) as any
      const transcripts = data.transcripts || []

      if (transcripts.length === 0) {
        toast.error('Esta sessão não possui transcrições')
        return
      }

      const header = [
        `# Relatório de Sessão`,
        `# Título: ${data.title || '-'}`,
        `# Tópico: ${data.topic || '-'}`,
        `# Data: ${data.actual_start ? new Date(data.actual_start).toLocaleString('pt-BR') : '-'}`,
        `# Duração: ${formatDuration(data.duration_minutes)}`,
        `# Agentes: ${(data.agents || []).map((a: any) => a.agent_name).join(', ') || '-'}`,
        `# Total de falas: ${transcripts.length}`,
        data.summary ? `\n# Resumo: ${data.summary}` : '',
        '',
        '='.repeat(60),
        '',
      ].join('\n')

      const body = transcripts
        .map((t: any, i: number) => `[Fala ${i + 1}] ${t.speaker_name}:\n${t.content}\n`)
        .join('\n---\n\n')

      const blob = new Blob([header + body], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `sessao-${sessionTitle.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.txt`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Sessão exportada com sucesso!')
    } catch {
      toast.error('Erro ao exportar sessão')
    } finally {
      setExporting(null)
    }
  }

  const exportAllSessions = async () => {
    if (filtered.length === 0) {
      toast.error('Nenhuma sessão para exportar')
      return
    }
    setExportingAll(true)
    try {
      const lines = [
        `# Exportação de Sessões - Sala de Reunião`,
        `# Data: ${new Date().toLocaleString('pt-BR')}`,
        `# Total de sessões: ${filtered.length}`,
        '',
        '='.repeat(60),
        '',
      ]

      for (const session of filtered) {
        lines.push(`## ${session.title}`)
        lines.push(`Tópico: ${session.topic || '-'}`)
        lines.push(`Data: ${session.actual_start ? new Date(session.actual_start).toLocaleString('pt-BR') : session.scheduled_start ? new Date(session.scheduled_start).toLocaleString('pt-BR') : '-'}`)
        lines.push(`Duração: ${formatDuration(session.duration_minutes)}`)
        lines.push(`Agentes: ${session.agent_count ?? 0}`)
        if (session.summary) lines.push(`Resumo: ${session.summary}`)
        lines.push('')
        lines.push('-'.repeat(40))
        lines.push('')
      }

      const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `todas-sessoes-${new Date().toISOString().split('T')[0]}.txt`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`${filtered.length} sessão(ões) exportada(s)!`)
    } catch {
      toast.error('Erro ao exportar')
    } finally {
      setExportingAll(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h2 flex items-center gap-2">
            <FolderArchive className="w-7 h-7 text-primary-500" />
            Arquivo de Sessões
          </h1>
          <p className="text-body text-gray-500 mt-1">
            {loading ? 'Carregando...' : `${sessions.length} sessão(ões) concluída(s)`}
          </p>
        </div>
        <Button
          variant="secondary"
          icon={<Download className="w-4 h-4" />}
          onClick={exportAllSessions}
          loading={exportingAll}
          disabled={filtered.length === 0}
        >
          Exportar Todas
        </Button>
      </div>

      {/* Dica */}
      {!loading && sessions.length === 0 && (
        <Card className="bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center shrink-0">
              <FolderArchive className="w-6 h-6 text-primary-500" />
            </div>
            <div>
              <h3 className="text-body font-semibold">Nenhuma sessão arquivada</h3>
              <p className="text-body-sm text-gray-600 dark:text-gray-400 mt-1">
                Quando você encerrar uma sessão de debate, ela aparecerá aqui automaticamente. 
                Você poderá rever as transcrições e exportar os relatórios.
              </p>
              <Button
                className="mt-3"
                size="sm"
                onClick={() => navigate('/meetings/create')}
                icon={<Play className="w-4 h-4" />}
              >
                Criar uma sessão
              </Button>
            </div>
          </div>
        </Card>
      )}

      {sessions.length > 0 && (
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por título ou tópico..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-10"
            />
          </div>
        </div>
      )}

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Carregando sessões...</div>
        ) : filtered.length === 0 && sessions.length > 0 ? (
          <div className="text-center py-12 text-gray-500">
            Nenhuma sessão encontrada para "{search}"
          </div>
        ) : (
          filtered.map((session) => (
            <Card key={session.id} className="hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-body font-semibold">{session.title}</h3>
                    <Badge variant="success">Concluída</Badge>
                  </div>
                  {session.topic && (
                    <p className="text-body-sm text-gray-500 mb-2">{session.topic}</p>
                  )}
                  <div className="flex items-center gap-4 text-body-xs text-gray-500 mb-3">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {session.actual_start || session.scheduled_start
                        ? new Date(session.actual_start || session.scheduled_start!).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '—'}
                    </span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatDuration(session.duration_minutes)}</span>
                    <span className="flex items-center gap-1"><Bot className="w-3 h-3" /> {session.agent_count ?? 0} agentes</span>
                  </div>
                  {session.summary && (
                    <p className="text-body-xs text-gray-400 line-clamp-2 mb-2">{session.summary}</p>
                  )}
                  {(session.tags?.length ?? 0) > 0 && (
                    <div className="flex gap-1.5">
                      {(session.tags ?? []).map((t) => <Badge key={t}>{t}</Badge>)}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Play className="w-4 h-4" />}
                    onClick={() => navigate(`/meetings/${session.id}/room`)}
                  >
                    Ver Sessão
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Download className="w-4 h-4" />}
                    loading={exporting === session.id}
                    onClick={() => exportSession(session.id, session.title)}
                  >
                    Exportar
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
