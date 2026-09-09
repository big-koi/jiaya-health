import { describe, expect, it, vi } from 'vitest'

vi.mock('../src/services/api/profiles.api', () => ({ profilesApi: { list: vi.fn() } }))
vi.mock('../src/services/api/dashboard.api', () => ({ dashboardApi: { get: vi.fn() } }))

import { createProfileQueryService } from '../src/services/query/profile-query.service'

const profile = { id: 'p1', familyId: 'f1', name: '爸爸', avatar: null, elderMode: false }
const dashboard = {
  profile,
  measuredToday: false,
  latestRecord: null,
  todayTasks: [],
  sevenDaySummary: { recordCount: 0, avgSystolic: null, avgDiastolic: null, attentionCount: 0 },
  attention: null,
}

describe('profile query service', () => {
  it('缓存成员与摘要，并按 profile 隔离摘要', async () => {
    const listProfiles = vi.fn().mockResolvedValue([profile])
    const getDashboard = vi.fn((id: string) => Promise.resolve({ ...dashboard, profile: { ...profile, id } }))
    const service = createProfileQueryService({ listProfiles, getDashboard, ttlMs: 30_000 })

    await service.list()
    await service.list()
    await service.dashboard('p1')
    await service.dashboard('p1')
    await service.dashboard('p2')

    expect(listProfiles).toHaveBeenCalledTimes(1)
    expect(getDashboard).toHaveBeenCalledTimes(2)
  })

  it('force 跳过值缓存但复用同时进行的请求', async () => {
    let finish: ((value: typeof profile[]) => void) | undefined
    const listProfiles = vi.fn(() => new Promise<typeof profile[]>((resolve) => { finish = resolve }))
    const service = createProfileQueryService({ listProfiles, getDashboard: vi.fn(), ttlMs: 30_000 })

    const first = service.list({ force: true })
    const second = service.list({ force: true })
    expect(listProfiles).toHaveBeenCalledTimes(1)
    finish?.([profile])
    await expect(Promise.all([first, second])).resolves.toEqual([[profile], [profile]])
  })
})
