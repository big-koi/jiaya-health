import type { UserDTO } from '@bp/contracts'
import { Controller, Get, Inject, UseGuards } from '@nestjs/common'

import { CurrentUserParam, type CurrentUser } from '../common/auth/current-user.decorator'
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard'
import { AuthService } from './auth.service'

@Controller('users')
export class UsersController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUserParam() user: CurrentUser): Promise<UserDTO> {
    return this.authService.getCurrentUser(user.userId)
  }
}
