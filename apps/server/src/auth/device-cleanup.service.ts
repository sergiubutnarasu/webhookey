import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class DeviceCleanupService {
  private readonly logger = new Logger(DeviceCleanupService.name)

  constructor(private readonly prisma: PrismaService) {}

  @Cron('0 3 * * *') // Daily at 3 AM
  async cleanup() {
    this.logger.log('Starting device code cleanup...')

    // Delete expired and un-approved
    const expiredResult = await this.prisma.deviceCode.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
        approved: false,
      },
    })

    // Delete approved but userId is null (user deleted after approval)
    const orphanedResult = await this.prisma.deviceCode.deleteMany({
      where: {
        approved: true,
        userId: null,
      },
    })

    this.logger.log(
      `Cleaned up ${expiredResult.count} expired and ${orphanedResult.count} orphaned device codes`,
    )
  }
}
