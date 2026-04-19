import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'bg-[#6366f1] text-white',
        secondary: 'bg-[rgba(255,255,255,0.08)] text-[#d0d6e0]',
        destructive: 'bg-[rgba(239,68,68,0.15)] text-[#ef4444]',
        outline: 'border border-[rgba(255,255,255,0.08)] text-[#d0d6e0]',
        success: 'bg-[rgba(16,185,129,0.15)] text-[#3ecf8e]',
        neutral: 'bg-[rgba(255,255,255,0.08)] text-[#d0d6e0]',
        info: 'bg-[rgba(99,102,241,0.15)] text-[#818cf8]',
        error: 'bg-[rgba(239,68,68,0.15)] text-[#ef4444]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
