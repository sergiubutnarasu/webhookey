import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-uber focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        // Primary CTA: Uber Black with white text, full pill
        default: 'bg-[#000000] text-white hover:bg-[#333333] rounded-[999px] shadow-floating',
        // Secondary: White with black text, subtle hover
        secondary: 'bg-white text-[#000000] hover:bg-[#e2e2e2] rounded-[999px] border border-[#000000]',
        // Ghost: Chip Gray background for navigation chips
        ghost: 'bg-[#efefef] text-[#000000] hover:bg-[#e2e2e2] rounded-[999px]',
        // Destructive: Black with inverse for delete actions
        destructive: 'bg-[#000000] text-white hover:bg-[#333333] rounded-[999px]',
        // Outline: Bordered style for less prominent actions
        outline: 'border border-[#000000] bg-white text-[#000000] hover:bg-[#f3f3f3] rounded-[999px]',
        // Link: Text link style
        link: 'text-[#000000] underline-offset-4 hover:underline rounded-[999px]',
      },
      size: {
        // Compact button padding: 10px 12px
        default: 'h-10 px-4 py-2 text-[16px] leading-[1.25]',
        // Small variant
        sm: 'h-8 px-3 text-[14px] leading-[1.43]',
        // Large/comfortable padding: 14px 16px
        lg: 'h-12 px-5 text-[16px] leading-[1.25]',
        // Icon only button
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
