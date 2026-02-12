import { Outlet } from 'react-router-dom'
import { Bot } from 'lucide-react'

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-500/5 via-surface-light to-violet-500/5 dark:from-surface-dark dark:via-surface-dark dark:to-primary-900/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary-500 flex items-center justify-center shadow-lg">
            <Bot className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-h3 text-gray-900 dark:text-white">Sala de Reunião</h1>
            <p className="text-body-xs text-gray-500">Simulação Cognitiva Aumentada</p>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-surface-dark-alt rounded-2xl shadow-elevated border p-8">
          <Outlet />
        </div>

        {/* Footer */}
        <p className="text-center text-body-xs text-gray-400 mt-6">
          &copy; 2026 Sala de Reunião. Todos os direitos reservados.
        </p>
      </div>
    </div>
  )
}
