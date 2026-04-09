import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { ConfigService } from '@nestjs/config'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true })
  const config = app.get(ConfigService)

  app.use(helmet())
  app.use(cookieParser())

  // Two-tier CORS policy
  app.enableCors((req, callback) => {
    const url = req.url || ''
    // Match POST /hooks/:slug - public webhook receiver
    if (url.match(/^\/hooks\/[^\/]+([?#].*)?$/)) {
      callback(null, { origin: '*' })
    } else {
      // All other routes require credentials
      callback(null, {
        origin: config.getOrThrow<string>('WEB_ORIGIN'),
        allowedHeaders: ['Authorization', 'Content-Type'],
        credentials: true,
      })
    }
  })

  const port = 3000
  await app.listen(port)
  console.log(`Server running on http://localhost:${port}`)
}

bootstrap()
