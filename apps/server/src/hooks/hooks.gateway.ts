import { Injectable } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { Observable, Subject } from 'rxjs'
import { MessageEvent } from '@nestjs/common'

export interface SseMessage {
  type: string
  data: unknown
}

@Injectable()
export class HooksGateway {
  private subscribers: Map<string, Set<Subject<SseMessage>>> = new Map()
  private subscriberCount: Map<string, number> = new Map()

  constructor(private readonly eventEmitter: EventEmitter2) {}

  subscribe(slug: string): Observable<MessageEvent> {
    const subject = new Subject<SseMessage>()

    if (!this.subscribers.has(slug)) {
      this.subscribers.set(slug, new Set())
      this.subscriberCount.set(slug, 0)
    }

    this.subscribers.get(slug)!.add(subject)
    this.subscriberCount.set(slug, (this.subscriberCount.get(slug) || 0) + 1)

    // Subscribe to events for this slug
    const handler = (data: unknown) => {
      subject.next({ type: 'message', data })
    }

    this.eventEmitter.on(`hook:${slug}`, handler)

    // Heartbeat every 30 seconds
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
        this.subscribers.get(slug)?.delete(subject)
        this.subscriberCount.set(slug, (this.subscriberCount.get(slug) || 0) - 1)
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
