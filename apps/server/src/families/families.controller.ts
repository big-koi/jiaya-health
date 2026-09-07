import type { FamilyDTO, FamilySummaryDTO } from '@bp/contracts'
import { Body, Controller, Get, Inject, Param, Post, UseGuards } from '@nestjs/common'
import { IsNotEmpty, IsOptional, IsString } from 'class-validator'

import { CurrentUserParam, type CurrentUser } from '../common/auth/current-user.decorator'
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard'
import { FamiliesService } from './families.service'

class CreateFamilyDto {
  @IsString()
  @IsNotEmpty()
  name!: string

  @IsOptional()
  @IsString()
  avatar?: string | null
}

@Controller('families')
@UseGuards(JwtAuthGuard)
export class FamiliesController {
  constructor(@Inject(FamiliesService) private readonly familiesService: FamiliesService) {}

  @Post()
  create(@CurrentUserParam() user: CurrentUser, @Body() body: CreateFamilyDto): Promise<FamilyDTO> {
    return this.familiesService.create(user.userId, body)
  }

  @Get()
  list(@CurrentUserParam() user: CurrentUser): Promise<FamilySummaryDTO[]> {
    return this.familiesService.list(user.userId)
  }

  @Get(':id')
  get(@CurrentUserParam() user: CurrentUser, @Param('id') familyId: string): Promise<FamilyDTO> {
    return this.familiesService.get(user.userId, familyId)
  }
}
