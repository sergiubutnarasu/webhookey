import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common'
import { Request, Response } from 'express'

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()
    const status = exception.getStatus()
    const exceptionResponse = exception.getResponse()

    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : (exceptionResponse as any).message || exception.message

    const isProduction = process.env.NODE_ENV === 'production'

    const body: Record<string, unknown> = {
      statusCode: status,
      message,
    }

    if (!isProduction) {
      body.error = exception.name
      body.timestamp = new Date().toISOString()
      body.path = request.url
    }

    response.status(status).json(body)
  }
}
