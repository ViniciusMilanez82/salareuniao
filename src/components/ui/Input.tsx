import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils/cn'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="label">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            'input-field',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-400/50',
            className
          )}
          {...props}
        />
        {error && <p className="mt-1 text-body-xs text-red-500">{error}</p>}
        {hint && !error && <p className="mt-1 text-body-xs text-gray-500">{hint}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'
export { Input }
