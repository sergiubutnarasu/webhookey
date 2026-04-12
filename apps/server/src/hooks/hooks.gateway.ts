import { Injectable, Inject, OnModuleInit } from '@nestjs/common'
import { Observable, Subject } from 'rxjs'
import { MessageEvent } from '@nestjs/common'
import Redis from 'ioredis'
import { REDIS_PUB_CLIENT, REDIS_SUB_CLIENT } from '../redis/redis.module'

export interface SseMessage {
  type: string
  data: unknown
}

const MAX_SUBSCRIBERS_PER_CHANNEL = 10
const MAX_SUBSCRIBERS_PER_USER = 20

@Injectable()
export class HooksGateway implements OnModuleInit {
  private subscribers: Map<string, Set<Subject<SseMessage>>> = new Map()
  private subscriberCount: Map<string, number> = new Map()
  private userConnectionCount: Map<string, number> = new Map()

  constructor(
    @Inject(REDIS_PUB_CLIENT) private readonly pubClient: Redis,
    @Inject(REDIS_SUB_CLIENT) private readonly subClient: Redis,
  ) {}

  onModuleInit() {
    this.subClient.on('message', (channel: string, message: string) => {
      if (!channel.startsWith('hook:')) return
      const slug = channel.slice(5)
      const subs = this.subscribers.get(slug)
      if (!subs) return
      const data = JSON.parse(message)
      for (const subject of subs) {
        subject.next({ type: 'message', data })
      }
    })
  }

  private getChannel(slug: string): string {
    return `hook:${slug}`
  }

  subscribe(slug: string, userId: string): Observable<MessageEvent> {
    const currentCount = this.subscriberCount.get(slug) || 0
    if (currentCount >= MAX_SUBSCRIBERS_PER_CHANNEL) {
      throw new Error(`Max subscribers reached for channel ${slug}`)
    }

    const userCount = this.userConnectionCount.get(userId) || 0
    if (userCount >= MAX_SUBSCRIBERS_PER_USER) {
      throw new Error(`Max SSE connections reached for user`)
    }

    const subject = new Subject<SseMessage>()
    const channel = this.getChannel(slug)

    if (!this.subscribers.has(slug)) {
      this.subscribers.set(slug, new Set())
      this.subscriberCount.set(slug, 0)
      this.subClient.subscribe(channel)
    }

    this.subscribers.get(slug)!.add(subject)
    this.subscriberCount.set(slug, currentCount + 1)
    this.userConnectionCount.set(userId, userCount + 1)

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
        const subs = this.subscribers.get(slug)
        if (subs) {
          subs.delete(subject)
          if (subs.size === 0) {
            this.subscribers.delete(slug)
            this.subscriberCount.delete(slug)
            this.subClient.unsubscribe(channel)
          } else {
            this.subscriberCount.set(slug, subs.size)
          }
        }
        const newUserCount = (this.userConnectionCount.get(userId) || 1) - 1
        if (newUserCount <= 0) {
          this.userConnectionCount.delete(userId)
        } else {
          this.userConnectionCount.set(userId, newUserCount)
        }
      }
    })
  }

  emit(slug: string, data: unknown): void {
    this.pubClient.publish(this.getChannel(slug), JSON.stringify(data))
  }

  getSubscriberCount(slug: string): number {
    return this.subscriberCount.get(slug) || 0
  }

  disconnectAll(slug: string): void {
    const subs = this.subscribers.get(slug)
    if (!subs) return
    for (const subject of subs) {
      subject.next({ type: 'disconnect', data: '' })
      subject.complete()
    }
  }
}
