import { describe, expect, it, vi } from 'vitest'

import { DashboardService } from '../src/dashboard/dashboard.service'

describe('DashboardService', () => {
  it('使用今日有效血压记录明确返回 measuredToday', async () => {
    const profile = { id: 'profile-1', familyId: 'family-1', name: '妈妈', avatar: null, elderMode: false }
    const bloodPressure = {
      getLatest: vi.fn(async () => null),
      hasMeasuredToday: vi.fn(async () => true),
    }
    const service = new DashboardService(
      { getSummary: vi.fn(async () => profile) } as never,
      bloodPressure as never,
      {
        getBloodPressureSummary: vi.fn(async () => ({ recordCount: 0, avgSystolic: null, avgDiastolic: null, attentionCount: 0 })),
        getLatestPendingAttention: vi.fn(async () => null),
      } as never,
      { getTodayTasks: vi.fn(async () => []) } as never,
    )

    const result = await service.get('user-1', 'profile-1')

    expect(result.measuredToday).toBe(true)
    expect(bloodPressure.hasMeasuredToday).toHaveBeenCalledWith('user-1', 'profile-1')
  })
})
