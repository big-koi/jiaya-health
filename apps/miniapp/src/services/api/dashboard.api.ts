import type { DashboardResponse } from '@bp/contracts'

import { apiClient } from './client'

export const dashboardApi = {
  get: (profileId: string) => apiClient.get<DashboardResponse>('/dashboard', { profileId }),
}
