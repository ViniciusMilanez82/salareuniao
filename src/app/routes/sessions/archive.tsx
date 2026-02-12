import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Search, Calendar, Clock, Bot, FileText, Download, Play } from 'lucide-react'
import { useState } from 'react'

const mockArchive = [
  { id: '1', title: 'Análise de Impacto da Fusão ABC', date: '11 Fev 2026', duration: '45min', agents: 4, topics: ['fusão', 'M&A', 'finanças'], sentiment: 'positive', insights: 12 },
  { id: '2', title: 'Debate sobre Ética em IA Generativa', date: '10 Fev 2026', duration: '52min', agents: 5, topics: ['ética', 'IA', 'regulamentação'], sentiment: 'neutral', insights: 8 },
  { id: '3', title: 'Estratégia de Preços Q1', date: '08 Fev 2026', duration: '38min', agents: 3, topics: ['preços', 'competição'], sentiment: 'positive', insights: 15 },
  { id: '4', title: 'Revisão de Produto Beta', date: '05 Fev 2026', duration: '1h 10min', agents: 6, topics: ['produto', 'UX', 'bugs'], sentiment: 'negative', insights: 22 },
]

export default function SessionArchivePage() {
  const [search, setSearch] = useState('')

  const sentimentColors: Record<string, string> = {
    positive: 'text-secondary-500',
    negative: 'text-red-500',
    neutral: 'text-gray-500',
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
        {mockArchive.map((session) => (
          <Card key={session.id} interactive>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-body font-semibold">{session.title}</h3>
                  <Badge variant="success">Concluída</Badge>
                </div>
                <div className="flex items-center gap-4 text-body-xs text-gray-500 mb-3">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {session.date}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {session.duration}</span>
                  <span className="flex items-center gap-1"><Bot className="w-3 h-3" /> {session.agents} agentes</span>
                  <span className={`flex items-center gap-1 ${sentimentColors[session.sentiment]}`}>
                    Sentimento: {session.sentiment === 'positive' ? 'Positivo' : session.sentiment === 'negative' ? 'Negativo' : 'Neutro'}
                  </span>
                </div>
                <div className="flex gap-1.5">
                  {session.topics.map((t) => <Badge key={t}>{t}</Badge>)}
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <Badge variant="violet">{session.insights} insights</Badge>
                <Button variant="ghost" size="sm" icon={<Play className="w-4 h-4" />}>Replay</Button>
                <Button variant="secondary" size="sm" icon={<FileText className="w-4 h-4" />}>Relatório</Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
