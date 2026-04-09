import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  NotFoundException,
  ConflictException,
} from '@nestjs/common'
import { ChannelsService, CreateChannelDto, UpdateChannelDto } from './channels.service'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { ConfigService } from '@nestjs/config'
import { AuthenticatedRequest } from '../common/types/authenticated-request.interface'

@Controller('channels')
@UseGuards(JwtAuthGuard)
export class ChannelsController {
  constructor(
    private readonly channelsService: ChannelsService,
    private readonly config: ConfigService,
  ) {}

  @Get()
  async findAll(@Req() req: AuthenticatedRequest) {
    const channels = await this.channelsService.findAll(req.user.id)
    const baseUrl = this.config.getOrThrow<string>('BASE_URL')
    return channels.map((c: any) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      webhookUrl: `${baseUrl}/hooks/${c.slug}`,
      retentionDays: c.retentionDays,
      createdAt: c.createdAt,
    }))
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const channel = await this.channelsService.findOne(req.user.id, id)

    if (!channel) {
      throw new NotFoundException('Channel not found')
    }

    const baseUrl = this.config.getOrThrow<string>('BASE_URL')

    return {
      id: channel.id,
      slug: channel.slug,
      name: channel.name,
      webhookUrl: `${baseUrl}/hooks/${channel.slug}`,
      retentionDays: channel.retentionDays,
      createdAt: channel.createdAt,
    }
  }

  @Post()
  async create(@Body() dto: CreateChannelDto, @Req() req: AuthenticatedRequest) {
    try {
      const channel = await this.channelsService.create(req.user.id, dto)
      const baseUrl = this.config.getOrThrow<string>('BASE_URL')

      return {
        id: channel.id,
        slug: channel.slug,
        name: channel.name,
        webhookUrl: `${baseUrl}/hooks/${channel.slug}`,
        secret: channel.secret,
      }
    } catch (e: any) {
      if (e.code === 'P2002') {
        throw new ConflictException('Channel name already exists')
      }
      throw e
    }
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateChannelDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const channel = await this.channelsService.update(req.user.id, id, dto)

    if (!channel) {
      throw new NotFoundException('Channel not found')
    }

    return channel
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const result = await this.channelsService.remove(req.user.id, id)

    if (!result) {
      throw new NotFoundException('Channel not found')
    }

    return { success: true }
  }

  @Get(':id/events')
  async findEvents(
    @Param('id') id: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const parsedPage = Math.max(1, parseInt(page) || 1)
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit) || 20))

    const result = await this.channelsService.findEvents(
      req.user.id,
      id,
      parsedPage,
      parsedLimit,
    )

    if (!result) {
      throw new NotFoundException('Channel not found')
    }

    return result
  }
}
