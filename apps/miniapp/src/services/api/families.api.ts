import type { CreateFamilyRequest, FamilyDTO, FamilySummaryDTO } from '@bp/contracts'

import { apiClient } from './client'

export const familiesApi = {
  list: () => apiClient.get<FamilySummaryDTO[]>('/families'),
  create: (data: CreateFamilyRequest) => apiClient.post<FamilyDTO>('/families', data),
  get: (familyId: string) => apiClient.get<FamilyDTO>(`/families/${familyId}`),
}
