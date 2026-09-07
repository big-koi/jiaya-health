import { createParamDecorator, type ExecutionContext } from '@nestjs/common'
import type { Request } from 'express'

export type CurrentUser = { userId: string }

type AuthenticatedRequest = Request & { user: CurrentUser }

export const CurrentUserParam = createParamDecorator(
  (_data: unknown, context: ExecutionContext): CurrentUser =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().user,
)
