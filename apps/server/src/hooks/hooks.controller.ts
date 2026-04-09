import {
  Controller,
  Post,
  Param,
  Req,
  Res,
  UseGuards,
  NotFoundException,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  Sse,
} from '@nestjs/common'
import { Response, Request } from 'express'
import { Observable } from 'rxjs'
import { MessageEvent } from '@nestjs/common'
import { HooksService } from './hooks.service'
import { HooksGateway } from './hooks.gateway'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { PrismaService } from '../prisma/prisma.service'
import { AuthenticatedRequest } from '../common/types/authenticated-request.interface'

@Controller('hooks')
export class HooksController {
  constructor(
    private readonly hooksService: HooksService,
    private readonly hooksGateway: HooksGateway,
    private readonly prisma: PrismaService,
  ) {}

  @Post(':slug')
  @HttpCode(HttpStatus.OK)
  async receiveWebhook(
    @Param('slug') slug: string,
    @Req() req: Request & { rawBody?: Buffer },
    @Res() res: Response,
  ) {
    const rawBody = req.rawBody
    if (!rawBody) {
      res.status(400).json({ error: 'Missing body' })
      return
    }

    // Support both header names
    const signature =
      (req.headers['x-webhookey-signature'] as string) ||
      (req.headers['x-hub-signature-256'] as string)

    const result = await this.hooksService.receiveWebhook(slug, rawBody, signature)

    if (!result.received) {
      res.status(404).json({ error: 'Channel not found' })
      return
    }

    if (result.rejected) {
      res.status(403).json({ error: 'Signature verification failed' })
      return
    }

    res.json({ received: true })
  }

  @Sse(':slug/events')
  @UseGuards(JwtAuthGuard)
  async subscribeToEvents(
    @Param('slug') slug: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<Observable<MessageEvent>> {
    const channel = await this.prisma.channel.findUnique({
      where: { slug },
    })

    if (!channel) {
      throw new NotFoundException('Channel not found')
    }

    if (channel.userId !== req.user.id) {
      throw new ForbiddenException('Access denied')
    }

    return this.hooksGateway.subscribe(slug, req.user.id)
  }
}
