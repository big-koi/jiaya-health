import type { AttentionEventDTO, BloodPressureSummaryDTO } from '@bp/contracts'
import { ForbiddenException, Inject, Injectable } from '@nestjs/common'
import type { AttentionEvent } from '@prisma/client'

import { PrismaService } from '../prisma/prisma.service'

export type BloodPressureSummaryRange = '7d' | '30d'

@Injectable()
export class AnalysisService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getBloodPressureSummary(
    userId: string,
    profileId: string,
    range: BloodPressureSummaryRange,
  ): Promise<BloodPressureSummaryDTO> {
    await this.assertCanView(userId, profileId)
    const days = range === '7d' ? 7 : 30
    const now = new Date()
    const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
    const where = { profileId, deletedAt: null, measuredAt: { gte: from, lte: now } }
    const [aggregate, attentionCount] = await Promise.all([
      this.prisma.bloodPressureRecord.aggregate({
        where,
        _count: { _all: true },
        _avg: { systolic: true, diastolic: true },
      }),
      this.prisma.bloodPressureRecord.count({
        where: { ...where, attentionLevel: { in: ['ATTENTION', 'RECHECK'] } },
      }),
    ])

    return {
      recordCount: aggregate._count._all,
      avgSystolic: this.roundAverage(aggregate._avg.systolic),
      avgDiastolic: this.roundAverage(aggregate._avg.diastolic),
      attentionCount,
    }
  }

  async getLatestPendingAttention(userId: string, profileId: string): Promise<AttentionEventDTO | null> {
    await this.assertCanView(userId, profileId)
    const event = await this.prisma.attentionEvent.findFirst({
      where: { profileId, status: 'PENDING', record: { deletedAt: null } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    })
    return event ? this.toAttentionDto(event) : null
  }

  private async assertCanView(userId: string, profileId: string): Promise<void> {
    const permission = await this.prisma.profilePermission.findUnique({
      where: { profileId_userId: { profileId, userId } },
      select: { canView: true },
    })
    if (!permission?.canView) {
      throw new ForbiddenException({ code: 'PROFILE_VIEW_FORBIDDEN', message: '没有该健康档案的查看权限' })
    }
  }

  private roundAverage(value: number | null): number | null {
    return value === null ? null : Math.round(value * 10) / 10
  }

  private toAttentionDto(event: AttentionEvent): AttentionEventDTO {
    return {
      id: event.id,
      profileId: event.profileId,
      recordId: event.recordId,
      type: event.type,
      level: event.level.toLowerCase() as AttentionEventDTO['level'],
      status: event.status.toLowerCase() as AttentionEventDTO['status'],
      messageCode: event.messageCode,
      createdAt: event.createdAt.toISOString(),
      acknowledgedAt: event.acknowledgedAt?.toISOString() ?? null,
      resolvedAt: event.resolvedAt?.toISOString() ?? null,
    }
  }
}
