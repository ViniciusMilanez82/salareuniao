import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils/cn'
import { useAuthStore } from '@/stores/useAuthStore'
import {
  LayoutDashboard,
  Users,
  Bot,
  Calendar,
  BarChart3,
  Settings,
  FolderArchive,
  Handshake,
  Contact,
  Shield,
  Key,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
} from 'lucide-react'
import { useState } from 'react'
import { ROUTES } from '@/config/routes'

const mainNav = [
  { to: ROUTES.DASHBOARD, icon: LayoutDashboard, label: 'Painel', tooltip: 'Visão geral do workspace' },
  { to: ROUTES.MEETINGS, icon: Calendar, label: 'Sessões', tooltip: 'Criar e gerenciar debates com IA' },
  { to: ROUTES.AGENTS, icon: Bot, label: 'Agentes', tooltip: 'Seus assistentes de IA personalizados' },
  { to: ROUTES.SESSIONS_ARCHIVE, icon: FolderArchive, label: 'Arquivo', tooltip: 'Sessões concluídas e exportação' },
  { to: ROUTES.CONTACTS, icon: Contact, label: 'Contatos', tooltip: 'Sua rede de contatos profissionais' },
  { to: ROUTES.DEALS, icon: Handshake, label: 'Negócios', tooltip: 'Pipeline de vendas e oportunidades' },
  { to: ROUTES.DASHBOARD_ANALYTICS, icon: BarChart3, label: 'Métricas', tooltip: 'Estatísticas e insights' },
]

const adminNav = [
  { to: ROUTES.ADMIN_DASHBOARD, icon: Shield, label: 'Admin', tooltip: 'Painel administrativo' },
  { to: ROUTES.ADMIN_USERS, icon: Users, label: 'Usuários', tooltip: 'Gerenciar membros do workspace' },
  { to: ROUTES.ADMIN_INTEGRATIONS, icon: Key, label: 'Integrações', tooltip: 'API keys (OpenAI, etc.)' },
]

const bottomNav = [
  { to: ROUTES.SETTINGS, icon: Settings, label: 'Configurações', tooltip: 'Perfil, tema e segurança' },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()
  const { membership } = useAuthStore()
  const isAdmin = membership?.role === 'workspace_admin'

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen bg-surface-light dark:bg-surface-dark border-r transition-all duration-300 z-40 flex flex-col',
        collapsed ? 'w-[72px]' : 'w-72'
      )}
    >
      {/* Logo */}
      <div className="h-16 px-4 flex items-center justify-between border-b shrink-0">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-gray-900 dark:text-white">Sala de Reunião</span>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center mx-auto">
            <Bot className="w-5 h-5 text-white" />
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn('btn-icon shrink-0', collapsed && 'mx-auto mt-2')}
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 py-4 overflow-y-auto space-y-1">
        {mainNav.map(({ to, icon: Icon, label, tooltip }) => (
          <NavLink
            key={to}
            to={to}
            title={collapsed ? `${label} — ${tooltip}` : tooltip}
            className={({ isActive }) =>
              cn(
                'sidebar-item group relative',
                isActive && 'sidebar-item-active',
                collapsed && 'justify-center mx-1 px-2'
              )
            }
          >
            <Icon className="w-5 h-5 shrink-0" />
            {!collapsed && <span>{label}</span>}
            {/* Tooltip para modo colapsado */}
            {collapsed && (
              <span className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-body-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                {label}
              </span>
            )}
          </NavLink>
        ))}

        {isAdmin && (
          <>
            <div className={cn('mx-4 my-3 border-t', collapsed && 'mx-2')} />
            {!collapsed && (
              <p className="px-4 text-body-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Administração</p>
            )}
            {adminNav.map(({ to, icon: Icon, label, tooltip }) => (
              <NavLink
                key={to}
                to={to}
                title={collapsed ? `${label} — ${tooltip}` : tooltip}
                className={({ isActive }) =>
                  cn(
                    'sidebar-item group relative',
                    isActive && 'sidebar-item-active',
                    collapsed && 'justify-center mx-1 px-2'
                  )
                }
              >
                <Icon className="w-5 h-5 shrink-0" />
                {!collapsed && <span>{label}</span>}
                {collapsed && (
                  <span className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-body-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                    {label}
                  </span>
                )}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* Bottom Nav */}
      <div className="border-t py-2">
        {bottomNav.map(({ to, icon: Icon, label, tooltip }) => (
          <NavLink
            key={to}
            to={to}
            title={collapsed ? `${label} — ${tooltip}` : tooltip}
            className={({ isActive }) =>
              cn(
                'sidebar-item group relative',
                isActive && 'sidebar-item-active',
                collapsed && 'justify-center mx-1 px-2'
              )
            }
          >
            <Icon className="w-5 h-5 shrink-0" />
            {!collapsed && <span>{label}</span>}
            {collapsed && (
              <span className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-body-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                {label}
              </span>
            )}
          </NavLink>
        ))}
      </div>
    </aside>
  )
}
