import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-[999px] px-2.5 py-0.5 text-xs font-medium transition-uber focus:outline-none focus:ring-2 focus:ring-[#000000] focus:ring-offset-2',
  {
    variants: {
      variant: {
        // Chip style: gray background for counts/labels
        default: 'bg-[#efefef] text-[#000000] hover:bg-[#e2e2e2]',
        // Secondary: outlined style
        secondary: 'border border-[#000000] bg-white text-[#000000] hover:bg-[#f3f3f3]',
        // Inverted: black background for emphasis
        inverted: 'bg-[#000000] text-white hover:bg-[#333333]',
        // Outline: minimal style
        outline: 'border border-[#000000] text-[#000000]',
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
