import { describe, expect, expectTypeOf, it } from 'vitest'
import {
  API_ERROR_CODES,
  type ApiError,
  type AttentionLevel,
  type BloodPressureRecordDTO,
  type BloodPressureSource,
  type CreateBloodPressureRecordResponse,
  type DashboardResponse,
  type ProfilePermissionDTO,
} from './index'

describe('shared API contracts', () => {
  it('models the dashboard payload consumed by both applications', () => {
    const dashboard = {
      profile: { id: 'p1', name: '爸爸', avatar: null, elderMode: true },
      latestRecord: null,
      todayTasks: [{ time: '08:00', status: 'completed' }],
      sevenDaySummary: {
        recordCount: 0,
        avgSystolic: null,
        avgDiastolic: null,
        attentionCount: 0,
      },
      attention: null,
    } satisfies DashboardResponse

    expect(dashboard.profile.elderMode).toBe(true)
    expect(dashboard.todayTasks[0]?.status).toBe('completed')
  })

  it('keeps permission and blood-pressure values constrained', () => {
    const permission = {
      profileId: 'p1',
      userId: 'u1',
      canView: true,
      canRecord: true,
      canManageReminder: false,
      canManageProfile: false,
      canReceiveAttention: true,
    } satisfies ProfilePermissionDTO

    const record = {
      id: 'r1',
      profileId: 'p1',
      systolic: 128,
      diastolic: 82,
      pulse: 72,
      measuredAt: '2026-09-07T08:12:00+08:00',
      source: 'family',
      recordedByUserId: 'u1',
      measurementContext: { medication: 'before' },
      note: null,
      attentionLevel: 'normal',
      ruleVersion: 'v1',
      createdAt: '2026-09-07T08:12:01+08:00',
      updatedAt: '2026-09-07T08:12:01+08:00',
    } satisfies BloodPressureRecordDTO

    expect(permission.canRecord).toBe(true)
    expect(record.source).toBe('family')
    expectTypeOf(record.attentionLevel).toMatchTypeOf<AttentionLevel>()
    expectTypeOf(record.source).toMatchTypeOf<BloodPressureSource>()

    const createResponse = {
      record,
      attention: {
        level: 'normal',
        messageCode: 'BP_NORMAL',
        requireRecheck: false,
        ruleVersion: 'v1',
      },
    } satisfies CreateBloodPressureRecordResponse

    expect(createResponse.attention.requireRecheck).toBe(false)
  })

  it('publishes stable API error codes and response shape', () => {
    const error = {
      code: API_ERROR_CODES.PROFILE_RECORD_FORBIDDEN,
      message: '没有该成员的记录权限',
      requestId: 'req-1',
      details: { profileId: 'p1' },
    } satisfies ApiError

    expect(error.code).toBe('PROFILE_RECORD_FORBIDDEN')
    expect(API_ERROR_CODES).not.toHaveProperty('UNKNOWN_ERROR')
  })
})
