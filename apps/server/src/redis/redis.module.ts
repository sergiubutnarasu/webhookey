import { Module, Global, OnModuleDestroy, Inject } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Redis from 'ioredis'

export const REDIS_PUB_CLIENT = 'REDIS_PUB_CLIENT'
export const REDIS_SUB_CLIENT = 'REDIS_SUB_CLIENT'

@Global()
@Module({
  providers: [
    {
      provide: REDIS_PUB_CLIENT,
      useFactory: (configService: ConfigService) => {
        return new Redis(configService.getOrThrow<string>('REDIS_URL'))
      },
      inject: [ConfigService],
    },
    {
      provide: REDIS_SUB_CLIENT,
      useFactory: (configService: ConfigService) => {
        return new Redis(configService.getOrThrow<string>('REDIS_URL'))
      },
      inject: [ConfigService],
    },
  ],
  exports: [REDIS_PUB_CLIENT, REDIS_SUB_CLIENT],
})
export class RedisModule implements OnModuleDestroy {
  constructor(
    @Inject(REDIS_PUB_CLIENT) private readonly pubClient: Redis,
    @Inject(REDIS_SUB_CLIENT) private readonly subClient: Redis,
  ) {}

  async onModuleDestroy() {
    await Promise.all([this.pubClient.quit(), this.subClient.quit()])
  }
}
