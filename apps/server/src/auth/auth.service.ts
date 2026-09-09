import type { UserDTO, WechatLoginResponse } from '@bp/contracts'
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import type { User } from '@prisma/client'

import { PrismaService } from '../prisma/prisma.service'
import {
  InjectWechatSessionClient,
  type WechatSessionClient,
} from './wechat-session.client'

export type AccessTokenPayload = { sub: string }

@Injectable()
export class AuthService {
  constructor(
    @InjectWechatSessionClient() private readonly wechatSessionClient: WechatSessionClient,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(JwtService) private readonly jwtService: JwtService,
  ) {}

  async loginWithWechat(code: string): Promise<WechatLoginResponse> {
    const session = await this.wechatSessionClient.exchangeCode(code)
    const user = await this.prisma.user.upsert({
      where: { openid: session.openid },
      create: { openid: session.openid, unionid: session.unionid },
      update: session.unionid ? { unionid: session.unionid } : {},
    })
    const payload: AccessTokenPayload = { sub: user.id }

    return { accessToken: await this.jwtService.signAsync(payload), user: this.toUserDto(user) }
  }

  async getCurrentUser(userId: string): Promise<UserDTO> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new UnauthorizedException({ code: 'AUTH_REQUIRED', message: '登录已失效，请重新登录' })
    return this.toUserDto(user)
  }

  private toUserDto(user: User): UserDTO {
    return {
      id: user.id,
      nickname: user.nickname ?? '',
      avatar: user.avatar,
      phone: user.phone,
      status: user.status.toLowerCase() as UserDTO['status'],
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    }
  }
}
