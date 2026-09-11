export type ReminderRepeatType = 'daily' | 'weekdays'

export type MeasurementReminderDTO = {
  id: string
  profileId: string
  createdByUserId: string
  title: string
  timeOfDay: string
  repeatType: ReminderRepeatType
  weekdays: number[] | null
  enabled: boolean
  lateRemindMinutes: number | null
  createdAt: string
  updatedAt: string
}

export type CreateMeasurementReminderRequest = {
  profileId: string
  title: string
  timeOfDay: string
  repeatType: ReminderRepeatType
  weekdays?: number[] | null
  enabled?: boolean
  lateRemindMinutes?: number | null
}

export type UpdateMeasurementReminderRequest = Partial<
  Omit<CreateMeasurementReminderRequest, 'profileId'>
>

export type MeasurementTaskStatus = 'pending' | 'completed' | 'late'

export type MeasurementTaskDTO = {
  time: string
  status: MeasurementTaskStatus
}
