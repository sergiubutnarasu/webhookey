import { Module } from '@nestjs/common'
import { HooksService } from './hooks.service'
import { HooksController } from './hooks.controller'
import { HooksGateway } from './hooks.gateway'
import { EncryptionModule } from '../encryption/encryption.module'

@Module({
  imports: [EncryptionModule],
  providers: [HooksService, HooksGateway],
  controllers: [HooksController],
})
export class HooksModule {}
