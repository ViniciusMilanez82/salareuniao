import { cn } from '@/lib/utils/cn'

interface BadgeProps {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'violet' | 'default'
  children: React.ReactNode
  className?: string
}

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  const variants = {
    success: 'badge-success',
    warning: 'badge-warning',
    danger: 'badge-danger',
    info: 'badge-info',
    violet: 'badge-violet',
    default: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  }

  return (
    <span className={cn('badge', variants[variant], className)}>
      {children}
    </span>
  )
}
