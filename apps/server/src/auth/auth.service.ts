import { Injectable, Inject } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcrypt'
import { createHash } from 'crypto'
import { PrismaService } from '../prisma/prisma.service'
import { CRYPTO_SERVICE_TOKEN } from '../crypto/crypto.tokens'
import { ICryptoService } from '@webhookey/crypto'

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    @Inject(CRYPTO_SERVICE_TOKEN)
    private readonly crypto: ICryptoService,
  ) {}

  async createDeviceCode(): Promise<{
    device_code: string
    user_code: string
    verification_uri: string
    expires_in: number
    interval: number
  }> {
    const deviceCode = this.crypto.generateDeviceCode()
    const userCode = this.crypto.generateUserCode()
    const webOrigin = this.config.getOrThrow<string>('WEB_ORIGIN')

    const expiresIn = 600 // 10 minutes
    const interval = 5 // 5 seconds

    await this.prisma.deviceCode.create({
      data: {
        deviceCode,
        userCode,
        expiresAt: new Date(Date.now() + expiresIn * 1000),
        approved: false,
      },
    })

    return {
      device_code: deviceCode,
      user_code: userCode,
      verification_uri: `${webOrigin}/auth/activate`,
      expires_in: expiresIn,
      interval,
    }
  }

  async pollToken(deviceCode: string): Promise<{
    error?: string
    access_token?: string
    refresh_token?: string
  }> {
    const record = await this.prisma.deviceCode.findUnique({
      where: { deviceCode },
    })

    if (!record) {
      return { error: 'invalid_grant' }
    }

    if (record.expiresAt < new Date()) {
      return { error: 'expired_token' }
    }

    // Check slow_down before updating lastPolledAt
    if (
      record.lastPolledAt &&
      Date.now() - record.lastPolledAt.getTime() < 5000
    ) {
      return { error: 'slow_down' }
    }

    await this.prisma.deviceCode.update({
      where: { deviceCode },
      data: { lastPolledAt: new Date() },
    })

    if (!record.approved) {
      return { error: 'authorization_pending' }
    }

    if (!record.userId) {
      return { error: 'access_denied' }
    }

    // Get user
    const user = await this.prisma.user.findUnique({
      where: { id: record.userId },
    })

    if (!user) {
      return { error: 'access_denied' }
    }

    // Delete the device code (consumed)
    await this.prisma.deviceCode.delete({ where: { deviceCode } })

    // Issue tokens
    const tokens = await this.issueTokens(user.id, user.email)
    return tokens
  }

  async approveDeviceCode(
    userId: string,
    userCode: string,
  ): Promise<boolean> {
    const record = await this.prisma.deviceCode.findUnique({
      where: { userCode },
    })

    if (!record) {
      return false
    }

    if (record.approved || record.expiresAt < new Date()) {
      return false
    }

    await this.prisma.deviceCode.update({
      where: { userCode },
      data: { approved: true, userId },
    })

    return true
  }

  async signup(
    email: string,
    password: string,
    name: string,
  ): Promise<{ access_token: string; refresh_token: string } | null> {
    const existing = await this.prisma.user.findUnique({ where: { email } })
    if (existing) {
      return null // Email already registered
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const user = await this.prisma.user.create({
      data: { email, passwordHash, name },
    })

    return this.issueTokens(user.id, user.email)
  }

  async login(
    email: string,
    password: string,
  ): Promise<{ access_token: string; refresh_token: string } | null> {
    const user = await this.prisma.user.findUnique({ where: { email } })
    if (!user) {
      return null
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      return null
    }

    return this.issueTokens(user.id, user.email)
  }

  async refreshToken(
    token: string,
  ): Promise<{ access_token: string; refresh_token: string } | null> {
    const tokenHash = createHash('sha256').update(token).digest('hex')
    const record = await this.prisma.refreshToken.findUnique({
      where: { token: tokenHash },
    })

    if (!record || record.expiresAt < new Date()) {
      return null
    }

    // Keep old token valid for a short grace period to handle concurrent requests
    // (e.g. rapid page refreshes before browser processes Set-Cookie)
    await this.prisma.refreshToken.update({
      where: { token: tokenHash },
      data: { expiresAt: new Date(Date.now() + 60 * 1000) }, // 1 minute grace period
    })

    // Get user
    const user = await this.prisma.user.findUnique({
      where: { id: record.userId },
    })

    if (!user) {
      return null
    }

    return this.issueTokens(user.id, user.email)
  }

  async logout(token: string): Promise<void> {
    const tokenHash = createHash('sha256').update(token).digest('hex')
    await this.prisma.refreshToken
      .delete({ where: { token: tokenHash } })
      .catch(() => {})
  }

  async getMe(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    })
  }

  private async issueTokens(
    userId: string,
    email: string,
  ): Promise<{ access_token: string; refresh_token: string }> {
    const accessToken = this.jwt.sign({ sub: userId, email })
    const refreshToken = this.crypto.generateSecret()
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex')

    const refreshExpiresIn = parseInt(
      this.config.getOrThrow<string>('REFRESH_TOKEN_EXPIRES_IN').replace('d', ''),
    )

    await this.prisma.refreshToken.create({
      data: {
        token: tokenHash,
        userId,
        expiresAt: new Date(Date.now() + refreshExpiresIn * 24 * 60 * 60 * 1000),
      },
    })

    return { access_token: accessToken, refresh_token: refreshToken }
  }
}
