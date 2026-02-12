import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/components/shared/Sidebar'
import { Header } from '@/components/shared/Header'

export function MainLayout() {
  return (
    <div className="min-h-screen bg-surface-light dark:bg-surface-dark">
      <Sidebar />
      <div className="ml-72 transition-all duration-300">
        <Header />
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
