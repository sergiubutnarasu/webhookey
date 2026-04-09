import { Injectable, Inject, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { EncryptionService } from '../encryption/encryption.service'
import { HooksGateway } from './hooks.gateway'
import { CRYPTO_SERVICE_TOKEN } from '../crypto/crypto.tokens'
import { ICryptoService } from '@webhookey/crypto'

@Injectable()
export class HooksService {
  private readonly logger = new Logger(HooksService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly gateway: HooksGateway,
    @Inject(CRYPTO_SERVICE_TOKEN)
    private readonly crypto: ICryptoService,
  ) {}

  async receiveWebhook(
    slug: string,
    rawBody: Buffer,
    signature?: string,
  ): Promise<{ received: boolean; verified: boolean; rejected?: boolean }> {
    const channel = await this.prisma.channel.findUnique({
      where: { slug },
    })

    if (!channel) {
      return { received: false, verified: false }
    }

    let verified = false

    if (channel.encryptedSecret) {
      if (!signature) {
        this.logger.warn(`Channel ${slug}: webhook rejected — signature required but missing`)
        return { received: true, verified: false, rejected: true }
      }
      const secret = this.encryption.decrypt(channel.encryptedSecret)
      // Support both X-Webhookey-Signature and X-Hub-Signature-256
      const sig = signature.startsWith('sha256=') ? signature : `sha256=${signature}`
      verified = this.crypto.verifyHmac(rawBody, secret, sig)
      if (!verified) {
        this.logger.warn(`Channel ${slug}: webhook rejected — signature verification failed`)
        return { received: true, verified: false, rejected: true }
      }
    }
    // No secret configured — accepted as unverified

    // Parse payload for SSE emission
    let payload: unknown
    try {
      payload = JSON.parse(rawBody.toString())
    } catch {
      payload = { raw: rawBody.toString() }
    }

    // Create event
    const event = await this.prisma.webhookEvent.create({
      data: {
        channelId: channel.id,
        verified,
        status: 'pending',
      },
    })

    // Emit to SSE subscribers
    this.gateway.emit(slug, { verified, payload })

    // Check subscriber count and update status
    const subscriberCount = this.gateway.getSubscriberCount(slug)
    await this.prisma.webhookEvent.update({
      where: { id: event.id },
      data: { status: subscriberCount > 0 ? 'delivered' : 'failed' },
    })

    return { received: true, verified }
  }
}
