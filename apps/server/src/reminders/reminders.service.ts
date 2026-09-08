import type { MeasurementReminderDTO } from '@bp/contracts'
import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma, type MeasurementReminder } from '@prisma/client'

import { PrismaService } from '../prisma/prisma.service'
import type { CreateReminderDto } from './dto/create-reminder.dto'
import type { UpdateReminderDto } from './dto/update-reminder.dto'

@Injectable()
export class RemindersService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(userId: string, input: CreateReminderDto): Promise<MeasurementReminderDTO> {
    await this.assertPermission(userId, input.profileId, 'canManageReminder')
    this.assertWeekdayCombination(input.repeatType, input.weekdays)
    const reminder = await this.prisma.measurementReminder.create({
      data: {
        profileId: input.profileId,
        createdByUserId: userId,
        title: input.title,
        timeOfDay: input.timeOfDay,
        repeatType: input.repeatType.toUpperCase() as 'DAILY' | 'WEEKDAYS',
        weekdays: this.weekdaysValue(input.repeatType, input.weekdays),
        enabled: input.enabled ?? true,
        lateRemindMinutes: input.lateRemindMinutes,
      },
    })
    return this.toDto(reminder)
  }

  async list(userId: string, profileId: string): Promise<MeasurementReminderDTO[]> {
    await this.assertPermission(userId, profileId, 'canView')
    const reminders = await this.prisma.measurementReminder.findMany({
      where: { profileId },
      orderBy: [{ timeOfDay: 'asc' }, { id: 'asc' }],
    })
    return reminders.map((reminder) => this.toDto(reminder))
  }

  async update(userId: string, id: string, input: UpdateReminderDto): Promise<MeasurementReminderDTO> {
    const current = await this.find(id)
    await this.assertPermission(userId, current.profileId, 'canManageReminder')
    const repeatType = input.repeatType ?? current.repeatType.toLowerCase()
    const weekdays = input.weekdays === undefined ? (current.weekdays as number[] | null) : input.weekdays
    this.assertWeekdayCombination(repeatType, weekdays)
    const reminder = await this.prisma.measurementReminder.update({
      where: { id },
      data: {
        title: input.title,
        timeOfDay: input.timeOfDay,
        repeatType: input.repeatType?.toUpperCase() as 'DAILY' | 'WEEKDAYS' | undefined,
        weekdays:
          input.repeatType === undefined && input.weekdays === undefined
            ? undefined
            : this.weekdaysValue(repeatType, weekdays),
        enabled: input.enabled,
        lateRemindMinutes: input.lateRemindMinutes,
      },
    })
    return this.toDto(reminder)
  }

  async remove(userId: string, id: string): Promise<void> {
    const reminder = await this.find(id)
    await this.assertPermission(userId, reminder.profileId, 'canManageReminder')
    await this.prisma.measurementReminder.delete({ where: { id } })
  }

  private async find(id: string): Promise<MeasurementReminder> {
    const reminder = await this.prisma.measurementReminder.findUnique({ where: { id } })
    if (!reminder) throw new NotFoundException({ code: 'REMINDER_NOT_FOUND', message: '测量提醒不存在' })
    return reminder
  }

  private async assertPermission(
    userId: string,
    profileId: string,
    capability: 'canView' | 'canManageReminder',
  ): Promise<void> {
    const permission = await this.prisma.profilePermission.findUnique({
      where: { profileId_userId: { profileId, userId } },
      select: { canView: true, canManageReminder: true },
    })
    if (!permission?.[capability]) {
      throw new ForbiddenException({
        code: capability === 'canView' ? 'PROFILE_VIEW_FORBIDDEN' : 'PROFILE_REMINDER_MANAGE_FORBIDDEN',
        message: '没有该健康档案的提醒操作权限',
      })
    }
  }

  private weekdaysValue(repeatType: string, weekdays: number[] | null | undefined): Prisma.InputJsonValue | typeof Prisma.DbNull {
    return repeatType === 'weekdays' ? (weekdays as number[]) : Prisma.DbNull
  }

  private assertWeekdayCombination(repeatType: string, weekdays: unknown): void {
    const valid =
      repeatType === 'weekdays'
        ? Array.isArray(weekdays) && weekdays.length > 0
        : weekdays === undefined || weekdays === null
    if (!valid) {
      throw new BadRequestException({ code: 'INVALID_REMINDER', message: '提醒重复规则与星期配置不一致' })
    }
  }

  private toDto(reminder: MeasurementReminder): MeasurementReminderDTO {
    return {
      id: reminder.id,
      profileId: reminder.profileId,
      createdByUserId: reminder.createdByUserId,
      title: reminder.title,
      timeOfDay: reminder.timeOfDay,
      repeatType: reminder.repeatType.toLowerCase() as MeasurementReminderDTO['repeatType'],
      weekdays: reminder.weekdays as number[] | null,
      enabled: reminder.enabled,
      lateRemindMinutes: reminder.lateRemindMinutes,
      createdAt: reminder.createdAt.toISOString(),
      updatedAt: reminder.updatedAt.toISOString(),
    }
  }
}
