import { Injectable } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { Observable, Subject } from 'rxjs'
import { MessageEvent } from '@nestjs/common'

export interface SseMessage {
  type: string
  data: unknown
}

const MAX_SUBSCRIBERS_PER_CHANNEL = 10
const MAX_SUBSCRIBERS_PER_USER = 20

@Injectable()
export class HooksGateway {
  private subscribers: Map<string, Set<Subject<SseMessage>>> = new Map()
  private subscriberCount: Map<string, number> = new Map()
  private userConnectionCount: Map<string, number> = new Map()

  constructor(private readonly eventEmitter: EventEmitter2) {}

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

    if (!this.subscribers.has(slug)) {
      this.subscribers.set(slug, new Set())
      this.subscriberCount.set(slug, 0)
    }

    this.subscribers.get(slug)!.add(subject)
    this.subscriberCount.set(slug, currentCount + 1)
    this.userConnectionCount.set(userId, userCount + 1)

    const handler = (data: unknown) => {
      subject.next({ type: 'message', data })
    }

    this.eventEmitter.on(`hook:${slug}`, handler)

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
        this.eventEmitter.off(`hook:${slug}`, handler)
        const subs = this.subscribers.get(slug)
        if (subs) {
          subs.delete(subject)
          if (subs.size === 0) {
            this.subscribers.delete(slug)
            this.subscriberCount.delete(slug)
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
    this.eventEmitter.emit(`hook:${slug}`, data)
  }

  getSubscriberCount(slug: string): number {
    return this.subscriberCount.get(slug) || 0
  }
}
