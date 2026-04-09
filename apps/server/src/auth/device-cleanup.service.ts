import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class DeviceCleanupService {
  private readonly logger = new Logger(DeviceCleanupService.name)

  constructor(private readonly prisma: PrismaService) {}

  @Cron('0 3 * * *') // Daily at 3 AM
  async cleanup() {
    this.logger.log('Starting auth cleanup...')

    // Delete expired and un-approved device codes
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

    // Delete expired refresh tokens
    const expiredRefreshResult = await this.prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    })

    this.logger.log(
      `Cleaned up ${expiredResult.count} expired and ${orphanedResult.count} orphaned device codes, ${expiredRefreshResult.count} expired refresh tokens`,
    )
  }
}
