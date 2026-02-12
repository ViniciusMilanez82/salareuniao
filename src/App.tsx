import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthLayout } from '@/app/layouts/AuthLayout'
import { MainLayout } from '@/app/layouts/MainLayout'
import { MeetingLayout } from '@/app/layouts/MeetingLayout'
import { useAuthStore } from '@/stores/useAuthStore'
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

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  // For now, always allow access (demo mode)
  // In production, check useAuthStore().isAuthenticated
  return <>{children}</>
}

export default function App() {
  const { theme, setTheme } = useAuthStore()

  useEffect(() => {
    // Apply theme on mount
    setTheme(theme)
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

          <Route path="/sessions/archive" element={<SessionArchivePage />} />

          <Route path="/contacts" element={<ContactsPage />} />

          <Route path="/deals" element={<DealsPage />} />

          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settings/*" element={<SettingsPage />} />

          <Route path="/admin" element={<AnalyticsPage />} />
          <Route path="/admin/users" element={<AdminUsersPage />} />
          <Route path="/admin/audit" element={<AnalyticsPage />} />
          <Route path="/admin/billing" element={<DealsPage />} />
        </Route>

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
