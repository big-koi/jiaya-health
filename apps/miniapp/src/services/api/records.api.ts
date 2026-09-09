import type {
  BloodPressureListResponse,
  BloodPressureRecordDTO,
  BloodPressureSummaryDTO,
  CreateBloodPressureRecordRequest,
  CreateBloodPressureRecordResponse,
  UpdateBloodPressureRecordRequest,
} from '@bp/contracts'

import { apiClient } from './client'

export type BloodPressureListParams = {
  profileId: string
  from?: string
  to?: string
  cursor?: string
  limit?: number
}

export type BloodPressureSummaryRange = '7d' | '30d'

export const recordsApi = {
  list: (params: BloodPressureListParams) =>
    apiClient.get<BloodPressureListResponse>('/blood-pressure', params),
  summary: (profileId: string, range: BloodPressureSummaryRange) =>
    apiClient.get<BloodPressureSummaryDTO>('/blood-pressure/summary', { profileId, range }),
  create: (data: CreateBloodPressureRecordRequest) =>
    apiClient.post<CreateBloodPressureRecordResponse>('/blood-pressure', data),
  update: (id: string, data: UpdateBloodPressureRecordRequest) =>
    apiClient.patch<BloodPressureRecordDTO>(`/blood-pressure/${id}`, data),
  remove: (id: string) => apiClient.delete<void>(`/blood-pressure/${id}`),
}
