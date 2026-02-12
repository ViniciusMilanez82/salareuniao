import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { ROUTES } from '@/config/routes'
import {
  Plus, Search, Grid3X3, List, MoreVertical, Bot,
  Star, Copy, Trash2, Edit, Filter
} from 'lucide-react'

const mockAgents = [
  { id: '1', name: 'Analista Financeiro', role: 'Finanças', description: 'Especialista em análise financeira, valuation e M&A', tags: ['finanças', 'valuation'], usage_count: 34, average_rating: 4.8, is_active: true, avatar_url: null },
  { id: '2', name: 'Estrategista de Marketing', role: 'Marketing', description: 'Expert em marketing digital, branding e growth', tags: ['marketing', 'digital'], usage_count: 28, average_rating: 4.6, is_active: true, avatar_url: null },
  { id: '3', name: 'Advogado Cético', role: 'Jurídico', description: 'Análise jurídica crítica, compliance e regulamentação', tags: ['jurídico', 'compliance'], usage_count: 22, average_rating: 4.7, is_active: true, avatar_url: null },
  { id: '4', name: 'Especialista em Dados', role: 'Data Science', description: 'Machine learning, estatística e visualização de dados', tags: ['dados', 'ML'], usage_count: 19, average_rating: 4.5, is_active: true, avatar_url: null },
  { id: '5', name: 'Product Manager', role: 'Produto', description: 'Gestão de produto, user research e roadmap', tags: ['produto', 'UX'], usage_count: 15, average_rating: 4.4, is_active: true, avatar_url: null },
  { id: '6', name: 'Consultor de RH', role: 'Recursos Humanos', description: 'Gestão de pessoas, cultura organizacional e recrutamento', tags: ['RH', 'cultura'], usage_count: 11, average_rating: 4.3, is_active: false, avatar_url: null },
]

export default function AgentsListPage() {
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  const filtered = mockAgents.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.role.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h2">Agentes</h1>
          <p className="text-body text-gray-500 mt-1">{mockAgents.length} agentes no workspace</p>
        </div>
        <Button onClick={() => navigate(ROUTES.AGENT_CREATE)} icon={<Plus className="w-4 h-4" />}>
          Novo Agente
        </Button>
      </div>

      {/* Filters Bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar agentes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10"
          />
        </div>
        <Button variant="secondary" size="sm" icon={<Filter className="w-4 h-4" />}>
          Filtros
        </Button>
        <div className="flex border rounded-lg overflow-hidden">
          <button
            onClick={() => setView('grid')}
            className={`p-2 ${view === 'grid' ? 'bg-primary-500 text-white' : 'bg-white dark:bg-surface-dark-alt text-gray-500'}`}
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setView('list')}
            className={`p-2 ${view === 'list' ? 'bg-primary-500 text-white' : 'bg-white dark:bg-surface-dark-alt text-gray-500'}`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grid View */}
      {view === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((agent) => (
            <Card key={agent.id} interactive onClick={() => navigate(`/agents/${agent.id}`)}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Avatar name={agent.name} src={agent.avatar_url} size="lg" status={agent.is_active ? 'online' : 'offline'} />
                  <div>
                    <h3 className="text-body font-semibold">{agent.name}</h3>
                    <p className="text-body-sm text-gray-500">{agent.role}</p>
                  </div>
                </div>
                <button className="btn-icon w-8 h-8">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
              <p className="text-body-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                {agent.description}
              </p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {agent.tags.map((tag) => (
                  <Badge key={tag} variant="info">{tag}</Badge>
                ))}
              </div>
              <div className="flex items-center justify-between pt-3 border-t text-body-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Bot className="w-3 h-3" /> {agent.usage_count} usos
                </span>
                <span className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-accent-500" /> {agent.average_rating}
                </span>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        /* List View */
        <Card noPadding>
          <table className="w-full">
            <thead>
              <tr className="border-b text-body-xs text-gray-500 text-left">
                <th className="px-4 py-3 font-medium">Agente</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Usos</th>
                <th className="px-4 py-3 font-medium">Rating</th>
                <th className="px-4 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((agent) => (
                <tr
                  key={agent.id}
                  className="border-b last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                  onClick={() => navigate(`/agents/${agent.id}`)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={agent.name} size="sm" />
                      <div>
                        <p className="text-body-sm font-medium">{agent.name}</p>
                        <p className="text-body-xs text-gray-500 truncate max-w-[200px]">{agent.description}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-body-sm">{agent.role}</td>
                  <td className="px-4 py-3">
                    <Badge variant={agent.is_active ? 'success' : 'default'}>
                      {agent.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-body-sm">{agent.usage_count}</td>
                  <td className="px-4 py-3 text-body-sm">
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-accent-500" /> {agent.average_rating}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button className="btn-icon w-8 h-8" title="Editar"><Edit className="w-4 h-4" /></button>
                      <button className="btn-icon w-8 h-8" title="Duplicar"><Copy className="w-4 h-4" /></button>
                      <button className="btn-icon w-8 h-8 text-red-500" title="Excluir"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}
