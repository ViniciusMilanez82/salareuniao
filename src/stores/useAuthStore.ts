import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Workspace, WorkspaceMember } from '@/types/database.types'

interface AuthState {
  user: User | null
  workspace: Workspace | null
  membership: WorkspaceMember | null
  isLoading: boolean
  isAuthenticated: boolean
  theme: 'light' | 'dark' | 'system'
  setUser: (user: User | null) => void
  setWorkspace: (workspace: Workspace | null) => void
  setMembership: (membership: WorkspaceMember | null) => void
  setLoading: (loading: boolean) => void
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      workspace: null,
      membership: null,
      isLoading: true,
      isAuthenticated: false,
      theme: 'system',
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setWorkspace: (workspace) => set({ workspace }),
      setMembership: (membership) => set({ membership }),
      setLoading: (isLoading) => set({ isLoading }),
      setTheme: (theme) => {
        set({ theme })
        const root = document.documentElement
        root.classList.remove('light', 'dark')
        if (theme === 'system') {
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
          root.classList.add(prefersDark ? 'dark' : 'light')
        } else {
          root.classList.add(theme)
        }
      },
      logout: () => set({ user: null, workspace: null, membership: null, isAuthenticated: false }),
    }),
    {
      name: 'sala-reuniao-auth',
      partialize: (state) => ({ theme: state.theme }),
    }
  )
)
