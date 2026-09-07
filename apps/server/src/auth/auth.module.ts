import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'

import { JwtAuthGuard } from '../common/auth/jwt-auth.guard'
import { PrismaModule } from '../prisma/prisma.module'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { UsersController } from './users.controller'
import { WECHAT_SESSION_CLIENT, WechatApiSessionClient } from './wechat-session.client'

@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      useFactory: () => {
        const secret = process.env.JWT_SECRET
        if (!secret) throw new Error('JWT_SECRET is required')
        return { secret, signOptions: { expiresIn: '7d' } }
      },
    }),
  ],
  controllers: [AuthController, UsersController],
  providers: [
    AuthService,
    JwtAuthGuard,
    { provide: WECHAT_SESSION_CLIENT, useClass: WechatApiSessionClient },
  ],
})
export class AuthModule {}
