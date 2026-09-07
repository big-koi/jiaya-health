import type { ProfilePermissionDTO } from '@bp/contracts'
import { Body, Controller, Get, Inject, Param, Patch, UseGuards } from '@nestjs/common'
import { IsBoolean, IsNotEmpty, IsString } from 'class-validator'

import { JwtAuthGuard } from '../common/auth/jwt-auth.guard'
import { ProfilePermissionGuard, RequireProfilePermission } from '../common/guards/profile-permission.guard'
import { PermissionsService } from './permissions.service'

class SetProfilePermissionDto {
  @IsString() @IsNotEmpty() userId!: string
  @IsBoolean() canView!: boolean
  @IsBoolean() canRecord!: boolean
  @IsBoolean() canManageReminder!: boolean
  @IsBoolean() canManageProfile!: boolean
  @IsBoolean() canReceiveAttention!: boolean
}

@Controller('profiles/:profileId/permissions')
@UseGuards(JwtAuthGuard, ProfilePermissionGuard)
@RequireProfilePermission('canManageProfile')
export class PermissionsController {
  constructor(@Inject(PermissionsService) private readonly permissionsService: PermissionsService) {}

  @Get()
  list(@Param('profileId') profileId: string): Promise<ProfilePermissionDTO[]> {
    return this.permissionsService.list(profileId)
  }

  @Patch()
  set(@Param('profileId') profileId: string, @Body() body: SetProfilePermissionDto): Promise<ProfilePermissionDTO> {
    return this.permissionsService.set(profileId, body)
  }
}
