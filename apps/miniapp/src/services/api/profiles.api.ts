import type {
  CreateHealthProfileRequest,
  HealthProfileDTO,
  HealthProfileSummary,
  UpdateHealthProfileRequest,
} from '@bp/contracts'

import { apiClient } from './client'

export const profilesApi = {
  list: () => apiClient.get<HealthProfileSummary[]>('/profiles'),
  create: (data: CreateHealthProfileRequest) =>
    apiClient.post<HealthProfileDTO>('/profiles', data),
  get: (profileId: string) => apiClient.get<HealthProfileDTO>(`/profiles/${profileId}`),
  update: (profileId: string, data: UpdateHealthProfileRequest) =>
    apiClient.patch<HealthProfileDTO>(`/profiles/${profileId}`, data),
}
