import type {
  DashboardResponse,
  FamilySummaryDTO,
  HealthProfileSummary,
  ProfilePermissionDTO,
} from '@bp/contracts'

import { dashboardApi } from '../../services/api/dashboard.api'
import { familiesApi } from '../../services/api/families.api'
import { permissionsApi } from '../../services/api/permissions.api'
import { profilesApi } from '../../services/api/profiles.api'

export type FamilyMemberOverview = {
  profile: HealthProfileSummary
  dashboard: DashboardResponse | null
  canManageProfile: boolean
}

export type FamilyOverview = {
  families: FamilySummaryDTO[]
  members: FamilyMemberOverview[]
}

type FamilyServiceDependencies = {
  listFamilies: () => Promise<FamilySummaryDTO[]>
  listProfiles: () => Promise<HealthProfileSummary[]>
  getDashboard: (profileId: string) => Promise<DashboardResponse>
  listPermissions: (profileId: string) => Promise<ProfilePermissionDTO[]>
}

export function createFamilyService(dependencies: FamilyServiceDependencies) {
  return {
    loadOverview: async (userId: string | null): Promise<FamilyOverview> => {
      const [families, profiles] = await Promise.all([
        dependencies.listFamilies(),
        dependencies.listProfiles(),
      ])
      const members = await Promise.all(
        profiles.map(async (profile): Promise<FamilyMemberOverview> => {
          const [dashboardResult, permissionsResult] = await Promise.allSettled([
            dependencies.getDashboard(profile.id),
            dependencies.listPermissions(profile.id),
          ])
          const permissions =
            permissionsResult.status === 'fulfilled' ? permissionsResult.value : []
          return {
            profile,
            dashboard:
              dashboardResult.status === 'fulfilled' ? dashboardResult.value : null,
            canManageProfile: Boolean(
              userId &&
                permissions.some(
                  (permission) =>
                    permission.userId === userId && permission.canManageProfile,
                ),
            ),
          }
        }),
      )
      return { families, members }
    },
  }
}

export const familyService = createFamilyService({
  listFamilies: familiesApi.list,
  listProfiles: profilesApi.list,
  getDashboard: dashboardApi.get,
  listPermissions: permissionsApi.list,
})
