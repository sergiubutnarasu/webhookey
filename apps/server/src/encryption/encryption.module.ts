import { Module } from '@nestjs/common'
import { EncryptionService } from './encryption.service'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  providers: [EncryptionService],
  exports: [EncryptionService],
})
export class EncryptionModule {}
