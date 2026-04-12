import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { AuthenticatedRequest } from '../types/authenticated-request.interface'

@Injectable()
export class ChannelOwnershipGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const params = request.params
    const userId = request.user.id

    const id = params.id ?? params.slug
    if (!id) {
      throw new NotFoundException('Channel not found')
    }

    const channel = await this.prisma.channel.findUnique({ where: { id } })

    if (!channel) {
      throw new NotFoundException('Channel not found')
    }

    if (channel.userId !== userId) {
      throw new ForbiddenException('Access denied')
    }

    request.channel = channel
    return true
  }
}
