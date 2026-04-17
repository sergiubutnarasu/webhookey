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
  ConflictException,
} from '@nestjs/common'
import { ChannelsService, CreateChannelDto, UpdateChannelDto } from './channels.service'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { ChannelOwnershipGuard } from '../common/guards/channel-ownership.guard'
import { ConfigService } from '@nestjs/config'
import { AuthenticatedRequest } from '../common/types/authenticated-request.interface'
import { HooksGateway } from '../hooks/hooks.gateway'

@Controller('channels')
@UseGuards(JwtAuthGuard)
export class ChannelsController {
  constructor(
    private readonly channelsService: ChannelsService,
    private readonly config: ConfigService,
    private readonly hooksGateway: HooksGateway,
  ) {}

  @Get()
  async findAll(
    @Req() req: AuthenticatedRequest,
    @Query('page') page: string,
    @Query('limit') limit: string,
  ) {
    const parsedPage = Math.max(1, parseInt(page) || 1)
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit) || 20))

    const { data: channels, total } = await this.channelsService.findAll(req.user.id, parsedPage, parsedLimit)
    const baseUrl = this.config.getOrThrow<string>('BASE_URL')
    return {
      data: channels.map((c: any) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        webhookUrl: `${baseUrl}/hooks/${c.slug}`,
        retentionDays: c.retentionDays,
        hasSecret: !!c.encryptedSecret,
        createdAt: c.createdAt,
        connectedDevices: this.hooksGateway.getSubscriberCount(c.slug),
      })),
      total,
      page: parsedPage,
      limit: parsedLimit,
    }
  }

  @Get(':id')
  @UseGuards(ChannelOwnershipGuard)
  async findOne(@Req() req: AuthenticatedRequest) {
    const channel = req.channel!
    const baseUrl = this.config.getOrThrow<string>('BASE_URL')

    return {
      id: channel.id,
      slug: channel.slug,
      name: channel.name,
      webhookUrl: `${baseUrl}/hooks/${channel.slug}`,
      retentionDays: channel.retentionDays,
      hasSecret: !!channel.encryptedSecret,
      createdAt: channel.createdAt,
      connectedDevices: this.hooksGateway.getSubscriberCount(channel.slug),
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
  @UseGuards(ChannelOwnershipGuard)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateChannelDto,
  ) {
    return this.channelsService.update(id, dto)
  }

  @Delete(':id')
  @UseGuards(ChannelOwnershipGuard)
  async remove(@Param('id') id: string) {
    await this.channelsService.remove(id)
    return { success: true }
  }

  @Delete(':id/connections')
  @UseGuards(ChannelOwnershipGuard)
  async disconnectAll(@Req() req: AuthenticatedRequest) {
    const channel = req.channel!
    this.hooksGateway.disconnectAll(channel.slug)
    return { success: true }
  }

  @Get(':id/events')
  @UseGuards(ChannelOwnershipGuard)
  async findEvents(
    @Param('id') id: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
  ) {
    const parsedPage = Math.max(1, parseInt(page) || 1)
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit) || 20))

    return this.channelsService.findEvents(id, parsedPage, parsedLimit)
  }
}
