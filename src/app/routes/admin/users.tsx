import { useState } from 'react'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { USER_ROLES } from '@/config/constants'
import { Plus, Search, MoreVertical, Download, Upload } from 'lucide-react'

const mockUsers = [
  { id: '1', name: 'João Silva', email: 'joao@empresa.com', role: 'workspace_admin' as const, last_active: '2 min atrás', is_active: true },
  { id: '2', name: 'Maria Souza', email: 'maria@empresa.com', role: 'moderator' as const, last_active: '1h atrás', is_active: true },
  { id: '3', name: 'Pedro Santos', email: 'pedro@empresa.com', role: 'agent_creator' as const, last_active: '3h atrás', is_active: true },
  { id: '4', name: 'Ana Oliveira', email: 'ana@empresa.com', role: 'analyst' as const, last_active: '1 dia atrás', is_active: true },
  { id: '5', name: 'Carlos Lima', email: 'carlos@empresa.com', role: 'observer' as const, last_active: '5 dias atrás', is_active: false },
]

export default function AdminUsersPage() {
  const [search, setSearch] = useState('')

  const filtered = mockUsers.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  const roleVariant: Record<string, 'info' | 'success' | 'violet' | 'warning' | 'default'> = {
    workspace_admin: 'info',
    moderator: 'success',
    agent_creator: 'violet',
    analyst: 'warning',
    observer: 'default',
    integrator: 'default',
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h2">Usuários</h1>
          <p className="text-body text-gray-500 mt-1">{mockUsers.length} membros no workspace</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" icon={<Download className="w-4 h-4" />}>Exportar</Button>
          <Button icon={<Plus className="w-4 h-4" />}>Convidar Usuário</Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por nome ou email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field pl-10"
        />
      </div>

      <Card noPadding>
        <table className="w-full">
          <thead>
            <tr className="border-b text-body-xs text-gray-500 text-left">
              <th className="px-4 py-3 font-medium">
                <input type="checkbox" className="w-4 h-4 accent-primary-500" />
              </th>
              <th className="px-4 py-3 font-medium">Usuário</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Último Acesso</th>
              <th className="px-4 py-3 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((user) => (
              <tr key={user.id} className="border-b last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="px-4 py-3">
                  <input type="checkbox" className="w-4 h-4 accent-primary-500" />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={user.name} size="sm" status={user.is_active ? 'online' : 'offline'} />
                    <div>
                      <p className="text-body-sm font-medium">{user.name}</p>
                      <p className="text-body-xs text-gray-500">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={roleVariant[user.role]}>
                    {USER_ROLES[user.role].label}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={user.is_active ? 'success' : 'default'}>
                    {user.is_active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-body-sm text-gray-500">{user.last_active}</td>
                <td className="px-4 py-3">
                  <button className="btn-icon w-8 h-8">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
