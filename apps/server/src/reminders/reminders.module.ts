import { Module } from '@nestjs/common'

import { AuthModule } from '../auth/auth.module'
import { PrismaModule } from '../prisma/prisma.module'
import { NoopReminderNotificationAdapter, REMINDER_NOTIFICATION_ADAPTER } from './reminder-notification.adapter'
import { REMINDER_TASK_CONFIG, ReminderTaskService, type ReminderTaskConfig } from './reminder-task.service'
import { RemindersController } from './reminders.controller'
import { RemindersService } from './reminders.service'

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [RemindersController],
  providers: [
    RemindersService,
    ReminderTaskService,
    { provide: REMINDER_TASK_CONFIG, useFactory: readReminderTaskConfig },
    { provide: REMINDER_NOTIFICATION_ADAPTER, useClass: NoopReminderNotificationAdapter },
  ],
  exports: [ReminderTaskService, REMINDER_NOTIFICATION_ADAPTER],
})
export class RemindersModule {}

function readReminderTaskConfig(): ReminderTaskConfig {
  return {
    completionWindowMinutes: readNumber('REMINDER_COMPLETION_WINDOW_MINUTES', 0, 1440),
    timezoneOffsetMinutes: readNumber('APP_TIMEZONE_OFFSET_MINUTES', -840, 840),
  }
}

function readNumber(name: string, min: number, max: number): number {
  const raw = process.env[name]
  const value = Number(raw)
  if (raw === undefined || raw.trim() === '' || !Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}`)
  }
  return value
}
