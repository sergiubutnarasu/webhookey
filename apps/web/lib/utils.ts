import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Combines Tailwind classes with proper precedence and deduplication
 * Uses clsx for conditional classes and tailwind-merge for proper merging
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
