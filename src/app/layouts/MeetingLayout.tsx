import { Outlet } from 'react-router-dom'

export function MeetingLayout() {
  return (
    <div className="min-h-screen bg-surface-dark">
      <Outlet />
    </div>
  )
}
