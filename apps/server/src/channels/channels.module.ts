import { Module } from '@nestjs/common'
import { ChannelsService } from './channels.service'
import { ChannelsController } from './channels.controller'
import { RetentionService } from './retention.service'
import { EncryptionModule } from '../encryption/encryption.module'

@Module({
  imports: [EncryptionModule],
  providers: [ChannelsService, RetentionService],
  controllers: [ChannelsController],
  exports: [ChannelsService],
})
export class ChannelsModule {}
