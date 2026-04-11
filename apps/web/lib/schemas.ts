import { z } from 'zod'

/**
 * Validation schemas following SOLID principles
 * - Single Responsibility: Each schema validates one concern
 * - Open/Closed: Schemas can be extended via .merge()
 * - Interface Segregation: Separate schemas for each form type
 */

// Base email schema - reusable
export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Please enter a valid email address')

// Base password schema - reusable with configurable min length
export const createPasswordSchema = (minLength: number = 8) =>
  z
    .string()
    .min(1, 'Password is required')
    .min(minLength, `Password must be at least ${minLength} characters`)

// Login form schema
export const loginSchema = z.object({
  email: emailSchema,
  password: createPasswordSchema(8),
})

export type LoginFormData = z.infer<typeof loginSchema>

// Signup form schema
export const signupSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .min(2, 'Name must be at least 2 characters'),
  email: emailSchema,
  password: createPasswordSchema(8),
})

export type SignupFormData = z.infer<typeof signupSchema>

// Channel creation schema
export const createChannelSchema = z.object({
  name: z
    .string()
    .min(1, 'Channel name is required')
    .min(2, 'Channel name must be at least 2 characters')
    .max(100, 'Channel name must be less than 100 characters'),
})

export type CreateChannelFormData = z.infer<typeof createChannelSchema>

// Device activation schema
export const activateDeviceSchema = z.object({
  userCode: z
    .string()
    .min(1, 'Device code is required')
    .regex(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/, 'Invalid device code format (XXXX-XXXX)'),
})

export type ActivateDeviceFormData = z.infer<typeof activateDeviceSchema>
