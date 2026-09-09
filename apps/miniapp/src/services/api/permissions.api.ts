import type { ProfilePermissionDTO, SetProfilePermissionRequest } from '@bp/contracts'

import { apiClient } from './client'

export const permissionsApi = {
  list: (profileId: string) =>
    apiClient.get<ProfilePermissionDTO[]>(`/profiles/${profileId}/permissions`),
  set: (profileId: string, data: SetProfilePermissionRequest) =>
    apiClient.patch<ProfilePermissionDTO>(`/profiles/${profileId}/permissions`, data),
}
