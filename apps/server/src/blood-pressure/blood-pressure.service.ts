import type {
  BloodPressureListResponse,
  BloodPressureRecordDTO,
  CreateBloodPressureRecordResponse,
  MeasurementContext,
} from '@bp/contracts'
import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma, type BloodPressureRecord } from '@prisma/client'

import { ATTENTION_RULE_ENGINE } from '../attention/attention.module'
import type { AttentionRuleEngine } from '../attention/attention-rule.types'
import { PrismaService } from '../prisma/prisma.service'
import type { BloodPressureListQueryDto } from './dto/blood-pressure-list-query.dto'
import type { CreateBloodPressureDto } from './dto/create-blood-pressure.dto'
import type { UpdateBloodPressureDto } from './dto/update-blood-pressure.dto'

@Injectable()
export class BloodPressureService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ATTENTION_RULE_ENGINE) private readonly ruleEngine: AttentionRuleEngine,
  ) {}

  async create(userId: string, input: CreateBloodPressureDto): Promise<CreateBloodPressureRecordResponse> {
    const familyId = await this.assertPermission(userId, input.profileId, 'canRecord')
    const measuredAt = new Date(input.measuredAt)
    const attention = this.ruleEngine.evaluate({
      systolic: input.systolic,
      diastolic: input.diastolic,
      ...(input.pulse === undefined ? {} : { pulse: input.pulse }),
      measuredAt,
    })
    const record = await this.prisma.$transaction(async (tx) => {
      const created = await tx.bloodPressureRecord.create({
        data: {
          profileId: input.profileId,
          systolic: input.systolic,
          diastolic: input.diastolic,
          pulse: input.pulse,
          measuredAt,
          source: input.source.toUpperCase() as 'SELF' | 'FAMILY',
          recordedByUserId: userId,
          measurementContext: this.jsonValue(input.measurementContext),
          note: input.note,
          attentionLevel: attention.level.toUpperCase() as 'NORMAL' | 'ATTENTION' | 'RECHECK',
          ruleVersion: attention.ruleVersion,
        },
      })
      if (attention.level !== 'normal') {
        await tx.attentionEvent.create({
          data: {
            profileId: input.profileId,
            recordId: created.id,
            type: 'BLOOD_PRESSURE_READING',
            level: attention.level.toUpperCase() as 'ATTENTION' | 'RECHECK',
            messageCode: attention.messageCode,
          },
        })
      }
      await tx.auditLog.create({
        data: {
          actorUserId: userId,
          familyId,
          profileId: input.profileId,
          action: 'BLOOD_PRESSURE_CREATED',
          targetType: 'BloodPressureRecord',
          targetId: created.id,
          metadata: { source: input.source, attentionLevel: attention.level },
        },
      })
      return created
    })
    return { record: this.toDto(record), attention }
  }

  async list(userId: string, query: BloodPressureListQueryDto): Promise<BloodPressureListResponse> {
    await this.assertPermission(userId, query.profileId, 'canView')
    const take = query.limit
    const records = await this.prisma.bloodPressureRecord.findMany({
      where: {
        profileId: query.profileId,
        deletedAt: null,
        measuredAt: { gte: query.from ? new Date(query.from) : undefined, lte: query.to ? new Date(query.to) : undefined },
      },
      orderBy: [{ measuredAt: 'desc' }, { id: 'desc' }],
      take: take + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    })
    const hasNextPage = records.length > take
    const items = hasNextPage ? records.slice(0, take) : records
    return { items: items.map((record) => this.toDto(record)), nextCursor: hasNextPage ? items.at(-1)?.id ?? null : null }
  }

  async get(userId: string, recordId: string): Promise<BloodPressureRecordDTO> {
    const record = await this.findActive(recordId)
    await this.assertPermission(userId, record.profileId, 'canView')
    return this.toDto(record)
  }

  async getLatest(userId: string, profileId: string): Promise<BloodPressureRecordDTO | null> {
    await this.assertPermission(userId, profileId, 'canView')
    const record = await this.prisma.bloodPressureRecord.findFirst({
      where: { profileId, deletedAt: null, measuredAt: { lte: new Date() } },
      orderBy: [{ measuredAt: 'desc' }, { id: 'desc' }],
    })
    return record ? this.toDto(record) : null
  }

  async update(userId: string, recordId: string, input: UpdateBloodPressureDto): Promise<BloodPressureRecordDTO> {
    const current = await this.findActive(recordId)
    const familyId = await this.assertPermission(userId, current.profileId, 'canRecord')
    const systolic = input.systolic ?? current.systolic
    const diastolic = input.diastolic ?? current.diastolic
    const pulse = input.pulse === undefined ? current.pulse : input.pulse
    const measuredAt = input.measuredAt ? new Date(input.measuredAt) : current.measuredAt
    const attention = this.ruleEngine.evaluate({ systolic, diastolic, ...(pulse === null ? {} : { pulse }), measuredAt })
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.bloodPressureRecord.update({
        where: { id: recordId },
        data: {
          systolic,
          diastolic,
          pulse,
          measuredAt,
          measurementContext:
            input.measurementContext === undefined ? undefined : this.jsonValue(input.measurementContext),
          note: input.note,
          attentionLevel: attention.level.toUpperCase() as 'NORMAL' | 'ATTENTION' | 'RECHECK',
          ruleVersion: attention.ruleVersion,
        },
      })
      if (attention.level !== 'normal') {
        await tx.attentionEvent.create({
          data: {
            profileId: current.profileId,
            recordId,
            type: 'BLOOD_PRESSURE_READING_UPDATED',
            level: attention.level.toUpperCase() as 'ATTENTION' | 'RECHECK',
            messageCode: attention.messageCode,
          },
        })
      }
      await tx.auditLog.create({
        data: {
          actorUserId: userId,
          familyId,
          profileId: current.profileId,
          action: 'BLOOD_PRESSURE_UPDATED',
          targetType: 'BloodPressureRecord',
          targetId: recordId,
          metadata: { attentionLevel: attention.level },
        },
      })
      return this.toDto(updated)
    })
  }

  async remove(userId: string, recordId: string): Promise<void> {
    const record = await this.findActive(recordId)
    const familyId = await this.assertPermission(userId, record.profileId, 'canRecord')
    await this.prisma.$transaction([
      this.prisma.bloodPressureRecord.update({ where: { id: recordId }, data: { deletedAt: new Date() } }),
      this.prisma.auditLog.create({
        data: {
          actorUserId: userId,
          familyId,
          profileId: record.profileId,
          action: 'BLOOD_PRESSURE_DELETED',
          targetType: 'BloodPressureRecord',
          targetId: recordId,
        },
      }),
    ])
  }

  private async findActive(recordId: string): Promise<BloodPressureRecord> {
    const record = await this.prisma.bloodPressureRecord.findFirst({ where: { id: recordId, deletedAt: null } })
    if (!record) throw new NotFoundException({ code: 'RECORD_NOT_FOUND', message: '血压记录不存在' })
    return record
  }

  private async assertPermission(
    userId: string,
    profileId: string,
    capability: 'canView' | 'canRecord',
  ): Promise<string> {
    const permission = await this.prisma.profilePermission.findUnique({
      where: { profileId_userId: { profileId, userId } },
      include: { profile: { select: { familyId: true } } },
    })
    if (!permission?.[capability]) {
      throw new ForbiddenException({
        code: capability === 'canView' ? 'PROFILE_VIEW_FORBIDDEN' : 'PROFILE_RECORD_FORBIDDEN',
        message: '没有该健康档案的操作权限',
      })
    }
    return permission.profile.familyId
  }

  private jsonValue(value: object | null | undefined): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
    if (value === null) return Prisma.DbNull
    return value as Prisma.InputJsonValue | undefined
  }

  private toDto(record: BloodPressureRecord): BloodPressureRecordDTO {
    return {
      id: record.id,
      profileId: record.profileId,
      systolic: record.systolic,
      diastolic: record.diastolic,
      pulse: record.pulse,
      measuredAt: record.measuredAt.toISOString(),
      source: record.source.toLowerCase() as BloodPressureRecordDTO['source'],
      recordedByUserId: record.recordedByUserId,
      measurementContext: record.measurementContext as MeasurementContext | null,
      note: record.note,
      attentionLevel: record.attentionLevel.toLowerCase() as BloodPressureRecordDTO['attentionLevel'],
      ruleVersion: record.ruleVersion,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    }
  }
}
