import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { USER_ROLES } from '@/config/constants'
import { fetchWorkspaceMembers, type WorkspaceMember } from '@/lib/api/workspace'
import { useAuthStore } from '@/stores/useAuthStore'
import { Plus, Search, MoreVertical, Download } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function AdminUsersPage() {
  const [search, setSearch] = useState('')
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [loading, setLoading] = useState(true)
  const { workspace } = useAuthStore()

  useEffect(() => {
    if (workspace?.id) {
      fetchWorkspaceMembers(workspace.id)
        .then(setMembers)
        .catch(() => setMembers([]))
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [workspace?.id])

  const filtered = members.filter((u) =>
    (u.name?.toLowerCase() || '').includes(search.toLowerCase()) ||
    (u.email?.toLowerCase() || '').includes(search.toLowerCase())
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
          <p className="text-body text-gray-500 mt-1">{loading ? 'Carregando...' : `${members.length} membros no workspace`}</p>
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
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-500">Carregando...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-500">Nenhum membro encontrado.</td></tr>
            ) : filtered.map((user) => (
              <tr key={user.id} className="border-b last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="px-4 py-3">
                  <input type="checkbox" className="w-4 h-4 accent-primary-500" />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={user.name} size="sm" src={user.avatar_url} status={user.user_active ? 'online' : 'offline'} />
                    <div>
                      <p className="text-body-sm font-medium">{user.name || user.email}</p>
                      <p className="text-body-xs text-gray-500">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={roleVariant[user.role] || 'default'}>
                    {USER_ROLES[user.role as keyof typeof USER_ROLES]?.label || user.role}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={user.user_active ? 'success' : 'default'}>
                    {user.user_active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-body-sm text-gray-500">
                  {user.last_active_at ? formatDistanceToNow(new Date(user.last_active_at), { addSuffix: true, locale: ptBR }) : '-'}
                </td>
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
