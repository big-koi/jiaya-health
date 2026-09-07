import type { WechatLoginResponse } from '@bp/contracts'
import { Body, Controller, HttpCode, Inject, Post } from '@nestjs/common'
import { IsNotEmpty, IsString } from 'class-validator'

import { AuthService } from './auth.service'

class WechatLoginDto {
  @IsString()
  @IsNotEmpty()
  code!: string
}

@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Post('wechat')
  @HttpCode(200)
  loginWithWechat(@Body() body: WechatLoginDto): Promise<WechatLoginResponse> {
    return this.authService.loginWithWechat(body.code)
  }
}
