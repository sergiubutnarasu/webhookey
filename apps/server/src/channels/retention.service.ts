import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class RetentionService {
  private readonly logger = new Logger(RetentionService.name)

  constructor(private readonly prisma: PrismaService) {}

  @Cron('0 2 * * *') // Daily at 2 AM
  async cleanup() {
    this.logger.log('Starting event retention cleanup...')

    const channels = await this.prisma.channel.findMany({
      where: {
        retentionDays: { not: null },
      },
    })

    let totalDeleted = 0

    for (const channel of channels) {
      if (!channel.retentionDays) continue

      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - channel.retentionDays)

      const result = await this.prisma.webhookEvent.deleteMany({
        where: {
          channelId: channel.id,
          createdAt: { lt: cutoff },
        },
      })

      totalDeleted += result.count
    }

    this.logger.log(`Cleaned up ${totalDeleted} events across ${channels.length} channels`)
  }
}
