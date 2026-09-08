import type { MeasurementTaskDTO } from '@bp/contracts'
import { Inject, Injectable } from '@nestjs/common'

import { PrismaService } from '../prisma/prisma.service'

export const REMINDER_TASK_CONFIG = Symbol('REMINDER_TASK_CONFIG')

export type ReminderTaskConfig = {
  completionWindowMinutes: number
  timezoneOffsetMinutes: number
}

@Injectable()
export class ReminderTaskService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(REMINDER_TASK_CONFIG) private readonly config: ReminderTaskConfig,
  ) {}

  async getTodayTasks(profileId: string, date: Date): Promise<MeasurementTaskDTO[]> {
    const offsetMs = this.config.timezoneOffsetMinutes * 60 * 1000
    const localDate = new Date(date.getTime() + offsetMs)
    const localMidnightAsUtc = Date.UTC(localDate.getUTCFullYear(), localDate.getUTCMonth(), localDate.getUTCDate())
    const dayStart = localMidnightAsUtc - offsetMs
    const dayEnd = dayStart + 24 * 60 * 60 * 1000
    const isoWeekday = localDate.getUTCDay() === 0 ? 7 : localDate.getUTCDay()
    const windowMs = this.config.completionWindowMinutes * 60 * 1000
    const [reminders, records] = await Promise.all([
      this.prisma.measurementReminder.findMany({
        where: { profileId, enabled: true },
        orderBy: [{ timeOfDay: 'asc' }, { id: 'asc' }],
      }),
      this.prisma.bloodPressureRecord.findMany({
        where: {
          profileId,
          deletedAt: null,
          measuredAt: { gte: new Date(dayStart - windowMs), lt: new Date(dayEnd + windowMs) },
        },
        select: { measuredAt: true },
      }),
    ])
    const effectiveReminders = reminders
      .filter((reminder) => {
        if (reminder.repeatType === 'DAILY') return true
        return (reminder.weekdays as number[] | null)?.includes(isoWeekday) ?? false
      })
      .map((reminder) => {
        const [hours, minutes] = reminder.timeOfDay.split(':').map(Number) as [number, number]
        return { reminder, target: dayStart + (hours * 60 + minutes) * 60 * 1000 }
      })

    const candidates = effectiveReminders
      .flatMap(({ target }, reminderIndex) =>
        records.map((record, recordIndex) => ({
          reminderIndex,
          recordIndex,
          distance: Math.abs(record.measuredAt.getTime() - target),
          target,
          measuredAt: record.measuredAt.getTime(),
        })),
      )
      .filter(({ distance }) => distance <= windowMs)
      .sort((left, right) =>
        left.distance - right.distance || left.target - right.target || left.measuredAt - right.measuredAt,
      )
    const matchedReminders = new Set<number>()
    const consumedRecords = new Set<number>()
    for (const candidate of candidates) {
      if (matchedReminders.has(candidate.reminderIndex) || consumedRecords.has(candidate.recordIndex)) continue
      matchedReminders.add(candidate.reminderIndex)
      consumedRecords.add(candidate.recordIndex)
    }

    return effectiveReminders.map(({ reminder, target }, reminderIndex) => {
        const completed = matchedReminders.has(reminderIndex)
        const lateAfterMinutes = reminder.lateRemindMinutes ?? this.config.completionWindowMinutes
        const status = completed ? 'completed' : date.getTime() > target + lateAfterMinutes * 60 * 1000 ? 'late' : 'pending'
        return { time: reminder.timeOfDay, status }
      })
  }
}
