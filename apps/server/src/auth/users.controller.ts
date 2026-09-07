import { Controller, Get, UseGuards } from '@nestjs/common'

import { CurrentUserParam, type CurrentUser } from '../common/auth/current-user.decorator'
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard'

@Controller('users')
export class UsersController {
  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUserParam() user: CurrentUser): CurrentUser {
    return user
  }
}
