import { Module, ValidationPipe } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { APP_INTERCEPTOR, APP_PIPE, APP_FILTER } from '@nestjs/core'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { ScheduleModule } from '@nestjs/schedule'
import { EventEmitterModule } from '@nestjs/event-emitter'
import { ThrottlerModule } from '@nestjs/throttler'
import * as Joi from 'joi'

import { PrismaModule } from './prisma/prisma.module'
import { CryptoModule } from './crypto/crypto.module'
import { EncryptionModule } from './encryption/encryption.module'
import { HealthModule } from './health/health.module'
import { AuthModule } from './auth/auth.module'
import { ChannelsModule } from './channels/channels.module'
import { HooksModule } from './hooks/hooks.module'
import { HttpExceptionFilter } from './common/filters/http-exception.filter'
import { LoggingInterceptor } from './common/interceptors/logging.interceptor'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        DATABASE_URL: Joi.string().required(),
        MASTER_KEY: Joi.string().min(32).required(),
        JWT_SECRET: Joi.string().min(32).required(),
        JWT_EXPIRES_IN: Joi.string().required(),
        REFRESH_TOKEN_EXPIRES_IN: Joi.string().required(),
        BASE_URL: Joi.string().uri().required(),
        WEB_ORIGIN: Joi.string().uri().required(),
      }),
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: config.getOrThrow<string>('JWT_EXPIRES_IN'),
        },
      }),
      inject: [ConfigService],
    }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    ThrottlerModule.forRoot([
      { name: 'device', ttl: 60000, limit: 5 },
      { name: 'token', ttl: 60000, limit: 60 },
      { name: 'login', ttl: 60000, limit: 10 },
      { name: 'signup', ttl: 60000, limit: 10 },
    ]),
    PrismaModule,
    CryptoModule,
    EncryptionModule,
    HealthModule,
    AuthModule,
    ChannelsModule,
    HooksModule,
  ],
  providers: [
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
