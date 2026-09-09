import type { HealthProfileDTO, ProfilePermissionDTO } from '@bp/contracts'

import { permissionsApi } from '../../services/api/permissions.api'
import { profilesApi } from '../../services/api/profiles.api'

export type ProfileDetail = {
  profile: HealthProfileDTO
  canManageProfile: boolean
}

export const profileService = {
  loadDetail: async (profileId: string, userId: string | null): Promise<ProfileDetail> => {
    const profile = await profilesApi.get(profileId)
    let permissions: ProfilePermissionDTO[] = []
    try {
      permissions = await permissionsApi.list(profileId)
    } catch {
      // 只读用户不能读取权限列表；详情仍可正常展示。
    }
    return {
      profile,
      canManageProfile: Boolean(
        userId &&
          permissions.some(
            (permission) =>
              permission.userId === userId && permission.canManageProfile,
          ),
      ),
    }
  },
}
