import type {
  CreateMeasurementReminderRequest,
  MeasurementReminderDTO,
  UpdateMeasurementReminderRequest,
} from '@bp/contracts'

import { apiClient } from './client'

export const remindersApi = {
  list: (profileId: string) =>
    apiClient.get<MeasurementReminderDTO[]>('/reminders', { profileId }),
  create: (data: CreateMeasurementReminderRequest) =>
    apiClient.post<MeasurementReminderDTO>('/reminders', data),
  update: (id: string, data: UpdateMeasurementReminderRequest) =>
    apiClient.patch<MeasurementReminderDTO>(`/reminders/${id}`, data),
  remove: (id: string) => apiClient.delete<void>(`/reminders/${id}`),
}
