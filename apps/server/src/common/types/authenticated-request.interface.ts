import { Request } from 'express'
import { Channel } from '@prisma/client'

export interface AuthenticatedRequest extends Request {
  user: {
    id: string
    email: string
  }
  channel?: Channel
}
