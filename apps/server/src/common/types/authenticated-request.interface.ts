import { Request } from 'express'
import { Channel } from '@prisma/client'

export interface AuthenticatedRequest extends Request {
  user: {
    id: string
    email: string
  }
  // Require channel to be present if the route is decorated with @UseGuards(ChannelOwnershipGuard)
  channel?: Channel
}
