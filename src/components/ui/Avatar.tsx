import { cn } from '@/lib/utils/cn'

interface AvatarProps {
  src?: string | null
  name: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  status?: 'online' | 'offline' | 'speaking' | 'muted'
}

export function Avatar({ src, name, size = 'md', className, status }: AvatarProps) {
  const sizes = {
    xs: 'w-6 h-6 text-body-xs',
    sm: 'w-8 h-8 text-body-xs',
    md: 'w-10 h-10 text-body-sm',
    lg: 'w-14 h-14 text-body',
    xl: 'w-20 h-20 text-h4',
  }

  const statusColors = {
    online: 'bg-secondary-500',
    offline: 'bg-gray-400',
    speaking: 'bg-accent-500 animate-pulse',
    muted: 'bg-red-500',
  }

  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const bgColors = [
    'bg-primary-500', 'bg-secondary-500', 'bg-accent-500', 'bg-violet-500',
    'bg-pink-500', 'bg-indigo-500', 'bg-cyan-500', 'bg-emerald-500',
  ]
  const colorIdx = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % bgColors.length

  return (
    <div className={cn('relative inline-flex', className)}>
      {src ? (
        <img
          src={src}
          alt={name}
          className={cn(sizes[size], 'rounded-full object-cover ring-2 ring-white dark:ring-gray-800')}
        />
      ) : (
        <div
          className={cn(
            sizes[size],
            bgColors[colorIdx],
            'rounded-full flex items-center justify-center text-white font-semibold ring-2 ring-white dark:ring-gray-800'
          )}
        >
          {initials}
        </div>
      )}
      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 block rounded-full ring-2 ring-white dark:ring-gray-800',
            statusColors[status],
            size === 'xs' || size === 'sm' ? 'w-2 h-2' : 'w-3 h-3'
          )}
        />
      )}
    </div>
  )
}
