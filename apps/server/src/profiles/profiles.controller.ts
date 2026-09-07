import type { HealthProfileDTO, HealthProfileSummary } from '@bp/contracts'
import { Body, Controller, Get, Inject, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { IsBoolean, IsDateString, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator'

import { CurrentUserParam, type CurrentUser } from '../common/auth/current-user.decorator'
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard'
import { ProfilePermissionGuard, RequireProfilePermission } from '../common/guards/profile-permission.guard'
import { ProfilesService } from './profiles.service'

class CreateProfileDto {
  @IsString() @IsNotEmpty() familyId!: string
  @IsString() @IsNotEmpty() name!: string
  @IsOptional() @IsString() avatar?: string | null
  @IsOptional() @IsIn(['male', 'female', 'other']) gender?: string | null
  @IsOptional() @IsDateString() birthday?: string | null
  @IsOptional() @IsString() relationship?: string | null
  @IsOptional() @IsBoolean() elderMode?: boolean
}

class UpdateProfileDto {
  @IsOptional() @IsString() @IsNotEmpty() name?: string
  @IsOptional() @IsString() avatar?: string | null
  @IsOptional() @IsIn(['male', 'female', 'other']) gender?: string | null
  @IsOptional() @IsDateString() birthday?: string | null
  @IsOptional() @IsString() relationship?: string | null
  @IsOptional() @IsBoolean() elderMode?: boolean
}

@Controller('profiles')
@UseGuards(JwtAuthGuard)
export class ProfilesController {
  constructor(@Inject(ProfilesService) private readonly profilesService: ProfilesService) {}

  @Post()
  create(@CurrentUserParam() user: CurrentUser, @Body() body: CreateProfileDto): Promise<HealthProfileDTO> {
    return this.profilesService.create(user.userId, body)
  }

  @Get()
  list(@CurrentUserParam() user: CurrentUser): Promise<HealthProfileSummary[]> {
    return this.profilesService.list(user.userId)
  }

  @Get(':id')
  @UseGuards(ProfilePermissionGuard)
  @RequireProfilePermission('canView')
  get(@Param('id') profileId: string): Promise<HealthProfileDTO> {
    return this.profilesService.get(profileId)
  }

  @Patch(':id')
  @UseGuards(ProfilePermissionGuard)
  @RequireProfilePermission('canManageProfile')
  update(@Param('id') profileId: string, @Body() body: UpdateProfileDto): Promise<HealthProfileDTO> {
    return this.profilesService.update(profileId, body)
  }
}
