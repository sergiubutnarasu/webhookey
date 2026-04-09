import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { ConfigService } from '@nestjs/config'
import { Logger } from '@nestjs/common'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import * as express from 'express'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  const config = app.get(ConfigService)

  app.use(helmet({
    hsts: process.env.NODE_ENV === 'production'
      ? { maxAge: 31536000, includeSubDomains: true }
      : false,
  }))
  app.use(cookieParser())
  app.use(express.json({
    limit: '1mb',
    verify: (req: express.Request & { rawBody?: Buffer }, _res: express.Response, buf: Buffer) => {
      req.rawBody = buf
    },
  }))
  app.use(express.urlencoded({ extended: true, limit: '1mb' }))

  // CSRF: verify Origin/Referer on state-changing requests for credentialed routes
  const webOrigin = config.getOrThrow<string>('WEB_ORIGIN')
  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    const method = req.method.toUpperCase()
    const isStateChanging = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)
    const isWebhook = /^\/hooks\/[^/]+([?#].*)?$/.test(req.url || '')
    // device flow and token refresh don't originate from a browser — the refresh token
    // is a cryptographically random secret so possessing it is proof of legitimacy
    const isDeviceFlow = req.url?.startsWith('/auth/token') || req.url?.startsWith('/auth/device') || req.url?.startsWith('/auth/refresh')

    const isBearerAuth = /^Bearer\s+\S/i.test(req.headers['authorization'] || '')

    if (isStateChanging && !isWebhook && !isDeviceFlow && !isBearerAuth) {
      const origin = req.headers['origin'] as string | undefined
      const referer = req.headers['referer'] as string | undefined
      const matchesOrigin = (value: string) =>
        value === webOrigin || value.startsWith(webOrigin + '/')
      const allowed =
        (origin && matchesOrigin(origin)) ||
        (!origin && referer && matchesOrigin(referer))
      if (!allowed) {
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
