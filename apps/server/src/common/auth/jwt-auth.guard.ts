import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import type { Request } from 'express'

import type { AccessTokenPayload } from '../../auth/auth.service'
import type { CurrentUser } from './current-user.decorator'

type AuthenticatedRequest = Request & { user?: CurrentUser }

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(@Inject(JwtService) private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const [scheme, token] = request.headers.authorization?.split(' ') ?? []
    if (scheme !== 'Bearer' || !token) this.reject()

    try {
      const payload = await this.jwtService.verifyAsync<AccessTokenPayload>(token)
      if (!payload.sub) this.reject()
      request.user = { userId: payload.sub }
      return true
    } catch {
      this.reject()
    }
  }

  private reject(): never {
    throw new UnauthorizedException({ code: 'AUTH_REQUIRED', message: '请先登录' })
  }
}
