import { describe, expect, it, vi } from 'vitest'

import { BloodPressureService } from '../src/blood-pressure/blood-pressure.service'

describe('BloodPressureService.hasMeasuredToday', () => {
  it('按中国标准时间统计未删除且不晚于当前时刻的今日记录', async () => {
    const count = vi.fn(async () => 1)
    const service = new BloodPressureService(
      {
        profilePermission: {
          findUnique: vi.fn(async () => ({ canView: true, profile: { familyId: 'family-1' } })),
        },
        bloodPressureRecord: { count },
      } as never,
      { evaluate: vi.fn() } as never,
    )
    const now = new Date('2026-09-09T23:30:00+08:00')

    await expect(service.hasMeasuredToday('user-1', 'profile-1', now)).resolves.toBe(true)
    expect(count).toHaveBeenCalledWith({
      where: {
        profileId: 'profile-1',
        deletedAt: null,
        measuredAt: {
          gte: new Date('2026-09-08T16:00:00.000Z'),
          lte: now,
        },
      },
    })
  })
})
