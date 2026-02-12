import { type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils/cn'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean
  noPadding?: boolean
}

export function Card({ className, interactive, noPadding, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        interactive ? 'card-interactive' : 'card',
        noPadding && 'p-0',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('mb-4', className)} {...props}>
      {children}
    </div>
  )
}

export function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('text-h4 text-gray-900 dark:text-gray-100', className)} {...props}>
      {children}
    </h3>
  )
}

export function CardDescription({ className, children, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('text-body-sm text-gray-500 dark:text-gray-400 mt-1', className)} {...props}>
      {children}
    </p>
  )
}

export function CardContent({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('', className)} {...props}>
      {children}
    </div>
  )
}

export function CardFooter({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('mt-4 pt-4 border-t flex items-center gap-3', className)} {...props}>
      {children}
    </div>
  )
}
