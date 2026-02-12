import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils/cn'
import { Loader2 } from 'lucide-react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: React.ReactNode
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, icon, children, disabled, ...props }, ref) => {
    const variants = {
      primary: 'btn-primary',
      secondary: 'btn-secondary',
      ghost: 'btn-ghost',
      danger: 'btn-danger',
    }

    const sizes = {
      sm: 'h-8 px-3 text-body-sm',
      md: '',
      lg: 'h-14 px-8 text-body-lg',
    }

    return (
      <button
        ref={ref}
        className={cn(variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
export { Button }
