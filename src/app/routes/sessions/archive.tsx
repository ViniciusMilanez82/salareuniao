import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/useAuthStore'
import { fetchMeetings } from '@/lib/api/meetings'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Search, Calendar, Clock, Bot, FileText, Download, Play } from 'lucide-react'

type ArchiveItem = {
  id: string
  title: string
  scheduled_start: string | null
  duration_minutes: number | null
  agent_count?: number
  tags: string[]
}

export default function SessionArchivePage() {
  const [search, setSearch] = useState('')
  const [sessions, setSessions] = useState<ArchiveItem[]>([])
  const [loading, setLoading] = useState(true)
  const { workspace } = useAuthStore()

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
    s.title?.toLowerCase().includes(search.toLowerCase())
  )

  const formatDuration = (min: number | null) => {
    if (!min) return '—'
    if (min >= 60) return `${Math.floor(min / 60)}h ${min % 60}min`
    return `${min}min`
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-h2">Arquivo de Sessões</h1>
        <p className="text-body text-gray-500 mt-1">Histórico e análise de sessões concluídas</p>
      </div>

      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Buscar nas transcrições..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-10" />
        </div>
        <Button variant="secondary" size="sm" icon={<Download className="w-4 h-4" />}>Exportar</Button>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-500">Nenhuma sessão concluída</div>
        ) : (
          filtered.map((session) => (
            <Card key={session.id} interactive>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-body font-semibold">{session.title}</h3>
                    <Badge variant="success">Concluída</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-body-xs text-gray-500 mb-3">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {session.scheduled_start ? new Date(session.scheduled_start).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatDuration(session.duration_minutes)}</span>
                    <span className="flex items-center gap-1"><Bot className="w-3 h-3" /> {session.agent_count ?? 0} agentes</span>
                  </div>
                  {(session.tags?.length ?? 0) > 0 && (
                    <div className="flex gap-1.5">
                      {(session.tags ?? []).map((t) => <Badge key={t}>{t}</Badge>)}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Button variant="ghost" size="sm" icon={<Play className="w-4 h-4" />}>Replay</Button>
                  <Button variant="secondary" size="sm" icon={<FileText className="w-4 h-4" />}>Relatório</Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
