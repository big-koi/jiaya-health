import type { HealthProfileDTO, HealthProfileSummary } from '@bp/contracts'
import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import type { HealthProfile } from '@prisma/client'

import { PrismaService } from '../prisma/prisma.service'

type CreateProfileInput = {
  familyId: string
  name: string
  avatar?: string | null
  gender?: string | null
  birthday?: string | null
  relationship?: string | null
  elderMode?: boolean
}

type UpdateProfileInput = Omit<Partial<CreateProfileInput>, 'familyId'>

@Injectable()
export class ProfilesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(userId: string, input: CreateProfileInput): Promise<HealthProfileDTO> {
    const membership = await this.prisma.familyMembership.findUnique({
      where: { familyId_userId: { familyId: input.familyId, userId } },
    })
    if (!membership || membership.status !== 'ACTIVE') {
      throw new ForbiddenException({ code: 'PROFILE_MANAGE_FORBIDDEN', message: '没有在该家庭创建档案的权限' })
    }
    const profile = await this.prisma.$transaction(async (tx) => {
      const created = await tx.healthProfile.create({
        data: {
          familyId: input.familyId,
          linkedUserId: null,
          name: input.name,
          avatar: input.avatar,
          gender: input.gender,
          birthday: input.birthday ? new Date(input.birthday) : null,
          relationship: input.relationship,
          elderMode: input.elderMode ?? false,
          createdByUserId: userId,
        },
      })
      await tx.profilePermission.create({
        data: {
          profileId: created.id,
          userId,
          canView: true,
          canRecord: true,
          canManageReminder: true,
          canManageProfile: true,
          canReceiveAttention: true,
        },
      })
      return created
    })
    return this.toDto(profile)
  }

  async list(userId: string): Promise<HealthProfileSummary[]> {
    const profiles = await this.prisma.healthProfile.findMany({
      where: { permissions: { some: { userId, canView: true } }, status: 'ACTIVE' },
      orderBy: { createdAt: 'asc' },
    })
    return profiles.map(({ id, name, avatar, elderMode }) => ({ id, name, avatar, elderMode }))
  }

  async getSummary(userId: string, profileId: string): Promise<HealthProfileSummary> {
    const profile = await this.prisma.healthProfile.findFirst({
      where: { id: profileId, status: 'ACTIVE', permissions: { some: { userId, canView: true } } },
      select: { id: true, name: true, avatar: true, elderMode: true },
    })
    if (!profile) {
      throw new ForbiddenException({ code: 'PROFILE_VIEW_FORBIDDEN', message: '没有该健康档案的查看权限' })
    }
    return profile
  }

  async get(profileId: string): Promise<HealthProfileDTO> {
    const profile = await this.prisma.healthProfile.findUnique({ where: { id: profileId } })
    if (!profile) throw new NotFoundException({ code: 'PROFILE_NOT_FOUND', message: '健康档案不存在' })
    return this.toDto(profile)
  }

  async update(profileId: string, input: UpdateProfileInput): Promise<HealthProfileDTO> {
    const existing = await this.prisma.healthProfile.findUnique({ where: { id: profileId }, select: { id: true } })
    if (!existing) throw new NotFoundException({ code: 'PROFILE_NOT_FOUND', message: '健康档案不存在' })
    const profile = await this.prisma.healthProfile.update({
      where: { id: profileId },
      data: {
        name: input.name,
        avatar: input.avatar,
        gender: input.gender,
        birthday: input.birthday === undefined ? undefined : input.birthday ? new Date(input.birthday) : null,
        relationship: input.relationship,
        elderMode: input.elderMode,
      },
    })
    return this.toDto(profile)
  }

  private toDto(profile: HealthProfile): HealthProfileDTO {
    const gender = ['male', 'female', 'other'].includes(profile.gender ?? '')
      ? (profile.gender as HealthProfileDTO['gender'])
      : null
    return {
      id: profile.id,
      familyId: profile.familyId,
      linkedUserId: profile.linkedUserId,
      name: profile.name,
      avatar: profile.avatar,
      gender,
      birthday: profile.birthday?.toISOString() ?? null,
      relationship: profile.relationship,
      elderMode: profile.elderMode,
      status: profile.status === 'ACTIVE' ? 'active' : 'inactive',
      createdBy: profile.createdByUserId,
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString(),
    }
  }
}
