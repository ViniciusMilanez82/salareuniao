import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { ErrorBoundary } from 'react-error-boundary'
import { AuthLayout } from '@/app/layouts/AuthLayout'
import { MainLayout } from '@/app/layouts/MainLayout'
import { MeetingLayout } from '@/app/layouts/MeetingLayout'
import { ErrorBoundaryFallback } from '@/components/shared/ErrorBoundaryFallback'
import { useAuthStore } from '@/stores/useAuthStore'
import { getCurrentUser } from '@/lib/auth/auth'
import { getToken } from '@/lib/api/client'
import { useEffect } from 'react'
import type { User, Workspace, WorkspaceMember } from '@/types/database.types'

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

// Settings
import SettingsPage from '@/app/routes/settings/index'

// 404
import NotFoundPage from '@/app/routes/NotFoundPage'

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
      if (!token) {
        const { isAuthenticated } = useAuthStore.getState()
        if (isAuthenticated) useAuthStore.getState().logout()
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        const data = await getCurrentUser()
        if (data) {
          setUser(data.user as User)
          if (data.workspaces?.length) {
            setWorkspace(data.workspaces[0] as Workspace)
            setMembership({ role: data.workspaces[0].role } as WorkspaceMember)
          }
        } else {
          // 401: token inválido ou expirado — limpar sessão
          const { clearToken: ct } = await import('@/lib/api/client')
          ct()
          useAuthStore.getState().logout()
        }
      } catch {
        // Erro de rede ou servidor: NÃO limpar token; manter store persistido se existir
        const { user, workspace, membership } = useAuthStore.getState()
        if (user) {
          setUser(user)
          if (workspace) setWorkspace(workspace)
          if (membership) setMembership(membership)
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
      <ErrorBoundary FallbackComponent={ErrorBoundaryFallback} onReset={() => window.location.reload()}>
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

          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settings/*" element={<SettingsPage />} />

          {/* Admin Routes — protegidas por AdminRoute */}
          <Route path="/admin" element={<Navigate to="/admin/users" replace />} />
          <Route path="/admin/users" element={<AdminRoute><AdminUsersPage /></AdminRoute>} />
          <Route path="/admin/integrations" element={<AdminRoute><AdminIntegrationsPage /></AdminRoute>} />
        </Route>

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  )
}
