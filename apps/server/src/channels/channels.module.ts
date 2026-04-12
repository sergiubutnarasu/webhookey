import { Module } from '@nestjs/common'
import { ChannelsService } from './channels.service'
import { ChannelsController } from './channels.controller'
import { ChannelsGateway } from './channels.gateway'
import { RetentionService } from './retention.service'
import { EncryptionModule } from '../encryption/encryption.module'
import { HooksModule } from '../hooks/hooks.module'
import { RedisModule } from '../redis/redis.module'
import { ChannelOwnershipGuard } from '../common/guards/channel-ownership.guard'

@Module({
  imports: [EncryptionModule, HooksModule, RedisModule],
  providers: [ChannelsService, ChannelsGateway, RetentionService, ChannelOwnershipGuard],
  controllers: [ChannelsController],
  exports: [ChannelsService, ChannelsGateway],
})
export class ChannelsModule {}
