import { Module } from '@nestjs/common'
import { ChannelsService } from './channels.service'
import { ChannelsController } from './channels.controller'
import { RetentionService } from './retention.service'
import { EncryptionModule } from '../encryption/encryption.module'
import { HooksModule } from '../hooks/hooks.module'
import { ChannelOwnershipGuard } from '../common/guards/channel-ownership.guard'

@Module({
  imports: [EncryptionModule, HooksModule],
  providers: [ChannelsService, RetentionService, ChannelOwnershipGuard],
  controllers: [ChannelsController],
  exports: [ChannelsService],
})
export class ChannelsModule {}
