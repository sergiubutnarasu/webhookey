import { Injectable, Inject } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { EncryptionService } from '../encryption/encryption.service'
import { CRYPTO_SERVICE_TOKEN } from '../crypto/crypto.tokens'
import { ICryptoService } from '@webhookey/crypto'
import { CreateChannelDto, UpdateChannelDto } from './dto/channels.dto'

export { CreateChannelDto, UpdateChannelDto }

@Injectable()
export class ChannelsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    @Inject(CRYPTO_SERVICE_TOKEN)
    private readonly crypto: ICryptoService,
  ) {}

  async findAll(userId: string) {
    return this.prisma.channel.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findOne(userId: string, id: string) {
    const channel = await this.prisma.channel.findFirst({
      where: { id, userId },
      include: {
        _count: {
          select: { events: true },
        },
      },
    })
    return channel
  }

  async create(userId: string, dto: CreateChannelDto) {
    // Determine the encrypted secret: use provided one, or generate new one
    let encryptedSecret: string | null = dto.encryptedSecret ?? null
    let secret: string | null = null

    if (encryptedSecret) {
      // User provided their own encrypted secret, we don't decrypt it
      // Secret will be null since we don't know the plaintext
      secret = null
    } else if (dto.generateSecret !== false) {
      // Generate a new secret
      secret = this.crypto.generateSecret()
      encryptedSecret = this.encryption.encrypt(secret)
    }

    const channel = await this.prisma.channel.create({
      data: {
        name: dto.name,
        encryptedSecret,
        retentionDays: dto.retentionDays ?? null,
        userId,
      },
    })

    return {
      ...channel,
      secret,
    }
  }

  async update(userId: string, id: string, dto: UpdateChannelDto) {
    // Verify ownership
    const existing = await this.findOne(userId, id)
    if (!existing) {
      return null
    }

    return this.prisma.channel.update({
      where: { id },
      data: dto,
    })
  }

  async remove(userId: string, id: string) {
    // Verify ownership
    const existing = await this.findOne(userId, id)
    if (!existing) {
      return null
    }

    await this.prisma.channel.delete({ where: { id } })
    return true
  }

  async findEvents(userId: string, channelId: string, page = 1, limit = 20) {
    // Verify ownership
    const channel = await this.findOne(userId, channelId)
    if (!channel) {
      return null
    }

    const skip = (page - 1) * limit

    const [data, total] = await Promise.all([
      this.prisma.webhookEvent.findMany({
        where: { channelId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.webhookEvent.count({ where: { channelId } }),
    ])

    return {
      data,
      total,
      page,
      limit,
    }
  }
}
