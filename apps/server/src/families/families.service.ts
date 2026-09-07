import type { FamilyDTO, FamilySummaryDTO } from '@bp/contracts'
import { Inject, Injectable, NotFoundException } from '@nestjs/common'

import { PrismaService } from '../prisma/prisma.service'

type CreateFamilyInput = { name: string; avatar?: string | null }

@Injectable()
export class FamiliesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(userId: string, input: CreateFamilyInput): Promise<FamilyDTO> {
    const family = await this.prisma.$transaction(async (tx) => {
      const created = await tx.family.create({
        data: { name: input.name, avatar: input.avatar, ownerUserId: userId },
      })
      await tx.familyMembership.create({
        data: { familyId: created.id, userId, role: 'OWNER' },
      })
      return created
    })
    return { ...this.toSummary(family, 1), createdAt: family.createdAt.toISOString(), updatedAt: family.updatedAt.toISOString() }
  }

  async list(userId: string): Promise<FamilySummaryDTO[]> {
    const families = await this.prisma.family.findMany({
      where: { memberships: { some: { userId, status: 'ACTIVE' } } },
      include: { _count: { select: { memberships: true } } },
      orderBy: { createdAt: 'asc' },
    })
    return families.map((family) => this.toSummary(family, family._count.memberships))
  }

  async get(userId: string, familyId: string): Promise<FamilyDTO> {
    const family = await this.prisma.family.findFirst({
      where: { id: familyId, memberships: { some: { userId, status: 'ACTIVE' } } },
      include: { _count: { select: { memberships: true } } },
    })
    if (!family) throw new NotFoundException({ code: 'FAMILY_NOT_FOUND', message: '家庭不存在' })
    return {
      ...this.toSummary(family, family._count.memberships),
      createdAt: family.createdAt.toISOString(),
      updatedAt: family.updatedAt.toISOString(),
    }
  }

  private toSummary(
    family: { id: string; name: string; avatar: string | null; ownerUserId: string },
    memberCount: number,
  ): FamilySummaryDTO {
    return { id: family.id, name: family.name, avatar: family.avatar, ownerUserId: family.ownerUserId, memberCount }
  }
}
