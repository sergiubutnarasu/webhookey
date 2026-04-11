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
          'flex h-10 w-full rounded-[8px] border border-[#000000] bg-white px-3 py-2 text-sm text-[#000000]',
          'ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium',
          'placeholder:text-[#afafaf]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#000000] focus-visible:ring-offset-1',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'transition-uber',
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
