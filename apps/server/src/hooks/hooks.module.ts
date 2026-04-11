import { Module } from '@nestjs/common'
import { HooksService } from './hooks.service'
import { HooksController } from './hooks.controller'
import { HooksGateway } from './hooks.gateway'
import { EncryptionModule } from '../encryption/encryption.module'
import { RedisModule } from '../redis/redis.module'
@Module({
  imports: [EncryptionModule, RedisModule],
  providers: [HooksService, HooksGateway],
  controllers: [HooksController],
  exports: [HooksGateway],
})
export class HooksModule {}
