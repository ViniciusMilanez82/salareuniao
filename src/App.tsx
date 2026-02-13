import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthLayout } from '@/app/layouts/AuthLayout'
import { MainLayout } from '@/app/layouts/MainLayout'
import { MeetingLayout } from '@/app/layouts/MeetingLayout'
import { useAuthStore } from '@/stores/useAuthStore'
import { getCurrentUser } from '@/lib/supabase/auth'
import { getToken } from '@/lib/api/client'
import { useEffect } from 'react'

// Auth Pages
import LoginPage from '@/app/routes/auth/LoginPage'
import RegisterPage from '@/app/routes/auth/RegisterPage'
import ForgotPasswordPage from '@/app/routes/auth/ForgotPasswordPage'

// Dashboard
import DashboardPage from '@/app/routes/dashboard/index'
import AnalyticsPage from '@/app/routes/dashboard/analytics'

// Agents
import AgentsListPage from '@/app/routes/agents/index'
import AgentCreatePage from '@/app/routes/agents/create'
import AgentEditPage from '@/app/routes/agents/edit'

// Meetings
import SessionsListPage from '@/app/routes/meetings/index'
import MeetingCreatePage from '@/app/routes/meetings/create'
import MeetingRoomPage from '@/app/routes/meetings/room'

// Sessions Archive
import SessionArchivePage from '@/app/routes/sessions/archive'

// Contacts
import ContactsPage from '@/app/routes/contacts/index'

// Deals
import DealsPage from '@/app/routes/deals/index'

// Settings
import SettingsPage from '@/app/routes/settings/index'

// Admin
import AdminUsersPage from '@/app/routes/admin/users'
import AdminIntegrationsPage from '@/app/routes/admin/integrations'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore()
  const location = useLocation()
  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Carregando...</p></div>
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />
  return <>{children}</>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { membership } = useAuthStore()
  const isAdmin = membership?.role === 'workspace_admin'
  if (!isAdmin) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <p className="text-h3 font-semibold text-gray-700 dark:text-gray-300">Acesso Restrito</p>
          <p className="text-body-sm text-gray-500 mt-2">
            Apenas administradores do workspace podem acessar esta página.
          </p>
          <a href="/dashboard" className="text-primary-500 text-body-sm font-medium hover:underline mt-4 inline-block">
            Voltar ao Painel
          </a>
        </div>
      </div>
    )
  }
  return <>{children}</>
}

export default function App() {
  const { theme, setTheme, setUser, setWorkspace, setMembership, setLoading } = useAuthStore()

  useEffect(() => {
    setTheme(theme)
  }, [])

  useEffect(() => {
    async function restoreSession() {
      const token = getToken()
      // Se já está autenticado no store persistido e tem token, validar em background
      const { isAuthenticated: wasAuthenticated } = useAuthStore.getState()
      if (!token) {
        // Sem token = deslogado
        if (wasAuthenticated) {
          useAuthStore.getState().logout()
        }
        setLoading(false)
        return
      }
      // Se já tem dados persistidos, mostrar imediatamente (sem loading)
      if (wasAuthenticated) {
        setLoading(false)
      } else {
        setLoading(true)
      }
      // Validar token com o servidor
      try {
        const data = await getCurrentUser()
        if (data) {
          setUser(data.user as any)
          if (data.workspaces?.length) {
            setWorkspace(data.workspaces[0] as any)
            setMembership({ role: data.workspaces[0].role } as any)
          }
        } else {
          // Token inválido ou expirado — limpar
          const { clearToken: ct } = await import('@/lib/api/client')
          ct()
          useAuthStore.getState().logout()
        }
      } catch {
        // Erro de rede — manter dados persistidos se existirem, senão limpar
        if (!wasAuthenticated) {
          const { clearToken: ct } = await import('@/lib/api/client')
          ct()
          useAuthStore.getState().logout()
        }
      } finally {
        setLoading(false)
      }
    }
    restoreSession()
  }, [])

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          className: 'text-body-sm',
          style: { borderRadius: '12px', padding: '12px 16px' },
        }}
      />
      <Routes>
        {/* Auth Routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        </Route>

        {/* Meeting Room (fullscreen, no sidebar) */}
        <Route element={<MeetingLayout />}>
          <Route path="/meetings/:id/room" element={
            <ProtectedRoute><MeetingRoomPage /></ProtectedRoute>
          } />
        </Route>

        {/* Main App Routes */}
        <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/dashboard/analytics" element={<AnalyticsPage />} />

          <Route path="/meetings" element={<SessionsListPage />} />
          <Route path="/meetings/create" element={<MeetingCreatePage />} />

          <Route path="/agents" element={<AgentsListPage />} />
          <Route path="/agents/create" element={<AgentCreatePage />} />
          <Route path="/agents/:id/edit" element={<AgentEditPage />} />

          <Route path="/sessions/archive" element={<SessionArchivePage />} />

          <Route path="/contacts" element={<ContactsPage />} />

          <Route path="/deals" element={<DealsPage />} />

          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settings/*" element={<SettingsPage />} />

          {/* Admin Routes — protegidas por AdminRoute */}
          <Route path="/admin" element={<Navigate to="/admin/users" replace />} />
          <Route path="/admin/users" element={<AdminRoute><AdminUsersPage /></AdminRoute>} />
          <Route path="/admin/integrations" element={<AdminRoute><AdminIntegrationsPage /></AdminRoute>} />
        </Route>

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
