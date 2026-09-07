import type { ProfilePermissionDTO } from '@bp/contracts'
import { Inject, Injectable } from '@nestjs/common'
import type { ProfilePermission } from '@prisma/client'

import { PrismaService } from '../prisma/prisma.service'

export type SetProfilePermissionInput = Omit<ProfilePermissionDTO, 'profileId'>

@Injectable()
export class PermissionsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(profileId: string): Promise<ProfilePermissionDTO[]> {
    const permissions = await this.prisma.profilePermission.findMany({ where: { profileId }, orderBy: { createdAt: 'asc' } })
    return permissions.map((permission) => this.toDto(permission))
  }

  async set(profileId: string, input: SetProfilePermissionInput): Promise<ProfilePermissionDTO> {
    const { userId, ...capabilities } = input
    const permission = await this.prisma.profilePermission.upsert({
      where: { profileId_userId: { profileId, userId } },
      create: { profileId, userId, ...capabilities },
      update: capabilities,
    })
    return this.toDto(permission)
  }

  private toDto(permission: ProfilePermission): ProfilePermissionDTO {
    return {
      profileId: permission.profileId,
      userId: permission.userId,
      canView: permission.canView,
      canRecord: permission.canRecord,
      canManageReminder: permission.canManageReminder,
      canManageProfile: permission.canManageProfile,
      canReceiveAttention: permission.canReceiveAttention,
    }
  }
}
