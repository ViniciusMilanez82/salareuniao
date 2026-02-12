import { useAuthStore } from '@/stores/useAuthStore'
import { Avatar } from '@/components/ui/Avatar'
import { Bell, Search, Moon, Sun, LogOut, User, ChevronDown } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { signOut } from '@/lib/supabase/auth'
import { ROUTES } from '@/config/routes'

export function Header() {
  const { user, theme, setTheme, logout } = useAuthStore()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleLogout = async () => {
    await signOut()
    logout()
    navigate(ROUTES.LOGIN)
  }

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <header className="h-16 bg-white dark:bg-surface-dark-alt border-b px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Search */}
      <div className="flex-1 max-w-xl">
        <div className={`relative transition-all duration-200 ${searchFocused ? 'scale-[1.02]' : ''}`}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar sessões, agentes, contatos... (Ctrl+K)"
            className="w-full h-10 pl-10 pr-4 rounded-full bg-gray-100 dark:bg-surface-dark text-body-sm
                       border-0 focus:outline-none focus:ring-2 focus:ring-primary-400/50
                       placeholder:text-gray-400"
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2 ml-4">
        {/* Theme Toggle */}
        <button onClick={toggleTheme} className="btn-icon" title="Alternar tema">
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* Notifications */}
        <button className="btn-icon relative" title="Notificações">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>

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
