import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-9 w-full rounded-md border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] px-3 py-2 text-sm text-[#f7f8f8]',
          'placeholder:text-[#6a6b6c]',
          'hover:border-[rgba(255,255,255,0.12)]',
          'focus-visible:outline-none focus-visible:border-[rgba(255,255,255,0.20)] focus-visible:ring-1 focus-visible:ring-[rgba(99,102,241,0.5)]',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'transition-[border-color,box-shadow] duration-150',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input }
