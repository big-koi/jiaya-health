import type { ApiError, ApiErrorCode } from '@bp/contracts'
import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ExceptionFilter,
} from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import type { Request, Response } from 'express'

type ErrorResponse = {
  code?: ApiErrorCode
  message?: string | string[]
  details?: Record<string, unknown>
}

@Catch()
export class ApiErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiErrorFilter.name)

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp()
    const request = http.getRequest<Request>()
    const response = http.getResponse<Response>()
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR
    if (!(exception instanceof HttpException)) this.logger.error(exception)
    const source = exception instanceof HttpException ? exception.getResponse() : undefined
    const normalized = typeof source === 'object' && source !== null ? (source as ErrorResponse) : {}
    const requestId = request.header('x-request-id') ?? randomUUID()
    const body: ApiError = {
      code: normalized.code ?? (status === HttpStatus.UNAUTHORIZED ? 'AUTH_REQUIRED' : 'INTERNAL_ERROR'),
      message: this.normalizeMessage(normalized.message, status),
      requestId,
      ...(normalized.details ? { details: normalized.details } : {}),
    }

    response.setHeader('x-request-id', requestId).status(status).json(body)
  }

  private normalizeMessage(message: string | string[] | undefined, status: number): string {
    if (Array.isArray(message)) return message.join('; ')
    if (message) return message
    return status === HttpStatus.UNAUTHORIZED ? '请先登录' : '服务暂时不可用'
  }
}
