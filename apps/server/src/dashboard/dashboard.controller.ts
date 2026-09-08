import type { DashboardResponse } from '@bp/contracts'
import { Controller, Get, Inject, Query, UseGuards, ValidationPipe } from '@nestjs/common'

import { CurrentUserParam, type CurrentUser } from '../common/auth/current-user.decorator'
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard'
import { DashboardService } from './dashboard.service'
import { DashboardQueryDto } from './dto/dashboard-query.dto'

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(@Inject(DashboardService) private readonly service: DashboardService) {}

  @Get()
  get(
    @CurrentUserParam() user: CurrentUser,
    @Query(new ValidationPipe({ transform: true, whitelist: true, expectedType: DashboardQueryDto }))
    query: DashboardQueryDto,
  ): Promise<DashboardResponse> {
    return this.service.get(user.userId, query.profileId)
  }
}
