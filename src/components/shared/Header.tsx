import { useAuthStore } from '@/stores/useAuthStore'
import { Avatar } from '@/components/ui/Avatar'
import { Bell, Search, Moon, Sun, LogOut, User, ChevronDown, X, Calendar, Bot, Loader2 } from 'lucide-react'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { signOut } from '@/lib/auth/auth'
import { ROUTES } from '@/config/routes'
import { fetchMeetings } from '@/lib/api/meetings'
import { fetchAgents } from '@/lib/api/agents'

type SearchResult = {
  id: string
  type: 'meeting' | 'agent'
  title: string
  subtitle: string
  route: string
}

export function Header() {
  const { user, workspace, theme, setTheme, logout } = useAuthStore()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>()

  // Fechar menus ao clicar fora
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowUserMenu(false)
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowResults(false)
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifications(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Atalho Ctrl+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
      if (e.key === 'Escape') {
        setShowResults(false)
        inputRef.current?.blur()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Busca real
  const doSearch = useCallback(async (q: string) => {
    if (!q.trim() || !workspace?.id) {
      setSearchResults([])
      setShowResults(false)
      return
    }
    setSearching(true)
    setShowResults(true)
    try {
      const qLower = q.toLowerCase()
      const [meetings, agents] = await Promise.all([
        fetchMeetings(workspace.id).catch(() => []),
        fetchAgents(workspace.id).catch(() => []),
      ])

      const results: SearchResult[] = []

      ;(meetings as { id: string; title: string; status: string; meeting_type: string }[])
        .filter(m => m.title?.toLowerCase().includes(qLower))
        .slice(0, 4)
        .forEach(m => results.push({
          id: m.id, type: 'meeting',
          title: m.title,
          subtitle: `Sessão · ${m.status === 'in_progress' ? 'Em andamento' : m.status === 'completed' ? 'Concluída' : m.status}`,
          route: `/meetings/${m.id}/room`,
        }))

      ;(agents as { id: string; name: string; role: string }[])
        .filter(a => a.name?.toLowerCase().includes(qLower) || a.role?.toLowerCase().includes(qLower))
        .slice(0, 4)
        .forEach(a => results.push({
          id: a.id, type: 'agent',
          title: a.name,
          subtitle: `Agente · ${a.role}`,
          route: `/agents/${a.id}/edit`,
        }))

      setSearchResults(results)
    } catch {
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }, [workspace?.id])

  const handleSearchInput = (value: string) => {
    setSearchQuery(value)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => doSearch(value), 300)
  }

  const handleLogout = async () => {
    await signOut()
    logout()
    navigate(ROUTES.LOGIN)
  }

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark')

  const typeIcons: Record<string, React.ReactNode> = {
    meeting: <Calendar className="w-4 h-4 text-primary-500" />,
    agent: <Bot className="w-4 h-4 text-violet-500" />,
  }

  // Notificações mockadas (prontas para integrar com backend)
  const notifications = [
    { id: '1', title: 'Sessão concluída', message: 'O debate "Análise de Mercado" foi encerrado.', time: '5 min', read: false },
    { id: '2', title: 'Novo agente criado', message: 'O agente "Analista Financeiro" está pronto.', time: '1h', read: true },
    { id: '3', title: 'Bem-vindo!', message: 'Configure suas integrações para começar a usar IA.', time: '1d', read: true },
  ]
  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <header className="h-16 bg-white dark:bg-surface-dark-alt border-b px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Search */}
      <div className="flex-1 max-w-xl" ref={searchRef}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Buscar sessões e agentes (Ctrl+K)"
            className="w-full h-10 pl-10 pr-10 rounded-full bg-gray-100 dark:bg-surface-dark text-body-sm
                       border-0 focus:outline-none focus:ring-2 focus:ring-primary-400/50
                       placeholder:text-gray-400"
            value={searchQuery}
            onChange={(e) => handleSearchInput(e.target.value)}
            onFocus={() => { if (searchQuery) setShowResults(true) }}
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(''); setSearchResults([]); setShowResults(false) }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Search Results Dropdown */}
          {showResults && (
            <div className="absolute top-12 left-0 right-0 bg-white dark:bg-surface-dark-alt rounded-xl shadow-elevated border max-h-96 overflow-y-auto z-50 animate-fade-in">
              {searching ? (
                <div className="flex items-center justify-center gap-2 py-8 text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" /> Buscando...
                </div>
              ) : searchResults.length === 0 ? (
                <div className="py-8 text-center text-gray-500 text-body-sm">
                  {searchQuery ? `Nenhum resultado para "${searchQuery}"` : 'Digite para buscar...'}
                </div>
              ) : (
                <div className="py-2">
                  {searchResults.map((r) => (
                    <button
                      key={`${r.type}-${r.id}`}
                      onClick={() => {
                        navigate(r.route)
                        setShowResults(false)
                        setSearchQuery('')
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 text-left transition-colors"
                    >
                      {typeIcons[r.type]}
                      <div className="min-w-0">
                        <p className="text-body-sm font-medium truncate">{r.title}</p>
                        <p className="text-body-xs text-gray-500 truncate">{r.subtitle}</p>
                      </div>
                    </button>
                  ))}
                  <div className="px-4 py-2 border-t text-body-xs text-gray-400">
                    {searchResults.length} resultado(s) encontrado(s)
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2 ml-4">
        {/* Theme Toggle */}
        <button onClick={toggleTheme} className="btn-icon" title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}>
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="btn-icon relative"
            title="Notificações"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-surface-dark-alt rounded-xl shadow-elevated border animate-fade-in z-50">
              <div className="px-4 py-3 border-b flex items-center justify-between">
                <h3 className="text-body-sm font-semibold">Notificações</h3>
                {unreadCount > 0 && (
                  <span className="text-body-xs text-primary-500 font-medium">{unreadCount} nova(s)</span>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-body-sm text-gray-500 py-8 text-center">Sem notificações</p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`px-4 py-3 border-b last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors ${
                        !n.read ? 'bg-primary-50/50 dark:bg-primary-900/10' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className={`text-body-sm ${!n.read ? 'font-semibold' : 'font-medium'}`}>{n.title}</p>
                          <p className="text-body-xs text-gray-500 mt-0.5">{n.message}</p>
                        </div>
                        <span className="text-body-xs text-gray-400 shrink-0 ml-2">{n.time}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="px-4 py-2 border-t text-center">
                <button className="text-body-xs text-primary-500 font-medium hover:underline">
                  Ver todas as notificações
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <Avatar name={user?.name || 'U'} src={user?.avatar_url} size="sm" />
            <span className="text-body-sm font-medium hidden md:block">
              {user?.name || 'Usuário'}
            </span>
            <ChevronDown className="w-4 h-4 text-gray-400 hidden md:block" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-surface-dark-alt rounded-xl shadow-elevated border animate-fade-in z-50">
              <div className="px-4 py-3 border-b">
                <p className="text-body-sm font-medium">{user?.name}</p>
                <p className="text-body-xs text-gray-500">{user?.email}</p>
              </div>
              <div className="py-1">
                <button
                  onClick={() => { navigate(ROUTES.SETTINGS_PROFILE); setShowUserMenu(false) }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-body-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <User className="w-4 h-4" /> Meu Perfil
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-body-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <LogOut className="w-4 h-4" /> Sair
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
