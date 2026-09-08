export interface ReminderNotificationAdapter {
  sendMeasurementReminder(input: { userId: string; profileId: string; reminderId: string }): Promise<void>
}

export const REMINDER_NOTIFICATION_ADAPTER = Symbol('REMINDER_NOTIFICATION_ADAPTER')

export class NoopReminderNotificationAdapter implements ReminderNotificationAdapter {
  async sendMeasurementReminder(): Promise<void> {}
}
