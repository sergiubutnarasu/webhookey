import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { ConfigService } from '@nestjs/config'
import { Logger } from '@nestjs/common'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import * as express from 'express'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true })
  const config = app.get(ConfigService)

  app.use(helmet({
    hsts: process.env.NODE_ENV === 'production'
      ? { maxAge: 31536000, includeSubDomains: true }
      : false,
  }))
  app.use(cookieParser())
  app.use(express.json({ limit: '1mb' }))
  app.use(express.urlencoded({ extended: true, limit: '1mb' }))

  // CSRF: verify Origin/Referer on state-changing requests for credentialed routes
  const webOrigin = config.getOrThrow<string>('WEB_ORIGIN')
  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    const method = req.method.toUpperCase()
    const isStateChanging = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)
    const isWebhook = /^\/hooks\/[^/]+([?#].*)?$/.test(req.url || '')
    const isAuthToken = req.url?.startsWith('/auth/token') // device flow polling — no browser origin

    if (isStateChanging && !isWebhook && !isAuthToken) {
      const origin = req.headers['origin'] || req.headers['referer']
      if (origin && !origin.startsWith(webOrigin)) {
        res.status(403).json({ message: 'Forbidden' })
        return
      }
    }
    next()
  })

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
  new Logger('Bootstrap').log(`Server running on http://localhost:${port}`)
}

bootstrap()
