import type { ProfilePermission } from '@prisma/client'
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  SetMetadata,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { Request } from 'express'

import type { CurrentUser } from '../auth/current-user.decorator'
import { PrismaService } from '../../prisma/prisma.service'

export type ProfilePermissionCapability = keyof Pick<
  ProfilePermission,
  'canView' | 'canRecord' | 'canManageReminder' | 'canManageProfile' | 'canReceiveAttention'
>

const PROFILE_PERMISSION = 'profile-permission'
export const RequireProfilePermission = (capability: ProfilePermissionCapability) =>
  SetMetadata(PROFILE_PERMISSION, capability)

type ProfileRequest = Request & { user: CurrentUser; params: { id?: string; profileId?: string } }

const FORBIDDEN_CODES: Record<ProfilePermissionCapability, string> = {
  canView: 'PROFILE_VIEW_FORBIDDEN',
  canRecord: 'PROFILE_RECORD_FORBIDDEN',
  canManageProfile: 'PROFILE_MANAGE_FORBIDDEN',
  canManageReminder: 'PROFILE_MANAGE_FORBIDDEN',
  canReceiveAttention: 'PROFILE_VIEW_FORBIDDEN',
}

@Injectable()
export class ProfilePermissionGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const capability = this.reflector.getAllAndOverride<ProfilePermissionCapability>(PROFILE_PERMISSION, [
      context.getHandler(),
      context.getClass(),
    ])
    if (!capability) return true
    const request = context.switchToHttp().getRequest<ProfileRequest>()
    const profileId = request.params.profileId ?? request.params.id
    const permission = profileId
      ? await this.prisma.profilePermission.findUnique({
          where: { profileId_userId: { profileId, userId: request.user.userId } },
        })
      : null
    if (!permission?.[capability]) {
      throw new ForbiddenException({ code: FORBIDDEN_CODES[capability], message: '没有该健康档案的操作权限' })
    }
    return true
  }
}
