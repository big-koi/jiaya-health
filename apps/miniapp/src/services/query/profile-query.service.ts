import type { DashboardResponse, HealthProfileSummary } from '@bp/contracts'
import { dashboardApi } from '../api/dashboard.api'
import { profilesApi } from '../api/profiles.api'
import { createQueryCache } from './query-cache'

type Dependencies = {
  listProfiles: () => Promise<HealthProfileSummary[]>
  getDashboard: (profileId: string) => Promise<DashboardResponse>
  ttlMs?: number
}

export function createProfileQueryService({ listProfiles, getDashboard, ttlMs = 30_000 }: Dependencies) {
  const cache = createQueryCache({ ttlMs })
  return {
    list(options: { force?: boolean } = {}): Promise<HealthProfileSummary[]> {
      if (options.force) cache.invalidate('profiles')
      return cache.dedupe('profiles', listProfiles)
    },
    dashboard(profileId: string, options: { force?: boolean } = {}): Promise<DashboardResponse> {
      const key = `dashboard:${profileId}`
      if (options.force) cache.invalidate(key)
      return cache.dedupe(key, () => getDashboard(profileId))
    },
    invalidateProfiles(): void { cache.invalidate('profiles') },
    invalidateDashboard(profileId: string): void { cache.invalidate(`dashboard:${profileId}`) },
  }
}

export const profileQueryService = createProfileQueryService({
  listProfiles: profilesApi.list,
  getDashboard: dashboardApi.get,
})
