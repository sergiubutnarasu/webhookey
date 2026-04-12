import { Injectable, Inject, OnModuleInit, Logger } from '@nestjs/common'
import { Observable, Subject } from 'rxjs'
import { MessageEvent } from '@nestjs/common'
import Redis from 'ioredis'
import { REDIS_PUB_CLIENT, REDIS_SUB_CLIENT } from '../redis/redis.module'

export interface ChannelSseMessage {
  type: 'event' | 'device' | 'heartbeat'
  data: unknown
}

const MAX_SUBSCRIBERS_PER_CHANNEL = 10
const MAX_SUBSCRIBERS_PER_USER = 20

@Injectable()
export class ChannelsGateway implements OnModuleInit {
  private readonly logger = new Logger(ChannelsGateway.name)
  private subscribers: Map<string, Set<Subject<ChannelSseMessage>>> = new Map()
  private subscriberCount: Map<string, number> = new Map()
  private userConnectionCount: Map<string, number> = new Map()

  constructor(
    @Inject(REDIS_PUB_CLIENT) private readonly pubClient: Redis,
    @Inject(REDIS_SUB_CLIENT) private readonly subClient: Redis,
  ) {}

  onModuleInit() {
    this.subClient.on('message', (channel: string, message: string) => {
      if (!channel.startsWith('channel:')) return
      const channelId = channel.slice(8)
      const subs = this.subscribers.get(channelId)
      if (!subs) return
      try {
        const data = JSON.parse(message)
        for (const subject of subs) {
          subject.next({ type: data.type, data: data.payload })
        }
      } catch (err) {
        this.logger.error(`Failed to parse message from ${channel}: ${err}`)
      }
    })
  }

  private getRedisChannel(channelId: string): string {
    return `channel:${channelId}`
  }

  subscribe(channelId: string, userId: string): Observable<MessageEvent> {
    const currentCount = this.subscriberCount.get(channelId) || 0
    if (currentCount >= MAX_SUBSCRIBERS_PER_CHANNEL) {
      throw new Error(`Max subscribers reached for channel ${channelId}`)
    }

    const userCount = this.userConnectionCount.get(userId) || 0
    if (userCount >= MAX_SUBSCRIBERS_PER_USER) {
      throw new Error(`Max SSE connections reached for user`)
    }

    const subject = new Subject<ChannelSseMessage>()
    const redisChannel = this.getRedisChannel(channelId)

    if (!this.subscribers.has(channelId)) {
      this.subscribers.set(channelId, new Set())
      this.subscriberCount.set(channelId, 0)
      this.subClient.subscribe(redisChannel)
    }

    this.subscribers.get(channelId)!.add(subject)
    this.subscriberCount.set(channelId, currentCount + 1)
    this.userConnectionCount.set(userId, userCount + 1)

    // Emit device count update
    this.emitEvent(channelId, 'device', { count: this.getSubscriberCount(channelId) })

    const heartbeat = setInterval(() => {
      subject.next({ type: 'heartbeat', data: '' })
    }, 30000)

    return new Observable((observer) => {
      subject.subscribe({
        next: (msg) => observer.next(msg as MessageEvent),
        error: (err) => observer.error(err),
        complete: () => observer.complete(),
      })

      return () => {
        clearInterval(heartbeat)
        const subs = this.subscribers.get(channelId)
        if (subs) {
          subs.delete(subject)
          if (subs.size === 0) {
            this.subscribers.delete(channelId)
            this.subscriberCount.delete(channelId)
            this.subClient.unsubscribe(redisChannel)
          } else {
            this.subscriberCount.set(channelId, subs.size)
          }
        }
        const newUserCount = (this.userConnectionCount.get(userId) || 1) - 1
        if (newUserCount <= 0) {
          this.userConnectionCount.delete(userId)
        } else {
          this.userConnectionCount.set(userId, newUserCount)
        }
        // Emit device count update after disconnect
        this.emitEvent(channelId, 'device', { count: this.getSubscriberCount(channelId) })
      }
    })
  }

  emitEvent(channelId: string, type: 'event' | 'device', data: unknown): void {
    const message = JSON.stringify({ type, payload: data })
    this.pubClient.publish(this.getRedisChannel(channelId), message)
  }

  getSubscriberCount(channelId: string): number {
    return this.subscriberCount.get(channelId) || 0
  }

  disconnectAll(channelId: string): void {
    const subs = this.subscribers.get(channelId)
    if (!subs) return
    for (const subject of subs) {
      subject.complete()
    }
  }
}
