// @vitest-environment jsdom

import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  families: { list: vi.fn(), create: vi.fn() },
  profiles: { list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn() },
  dashboard: { get: vi.fn() },
  permissions: { list: vi.fn() },
}))

const taro = vi.hoisted(() => {
  const storage = new Map<string, unknown>()
  return {
    storage,
    didShowCallbacks: [] as Array<() => void>,
    getStorageSync: vi.fn((key: string) => storage.get(key)),
    setStorageSync: vi.fn((key: string, value: unknown) => storage.set(key, value)),
    removeStorageSync: vi.fn((key: string) => storage.delete(key)),
    navigateTo: vi.fn(async () => ({ errMsg: 'navigateTo:ok' })),
    switchTab: vi.fn(async () => ({ errMsg: 'switchTab:ok' })),
    showToast: vi.fn(async () => ({ errMsg: 'showToast:ok' })),
    showModal: vi.fn(async () => ({ confirm: true, cancel: false })),
  }
})

vi.mock('../src/services/api/families.api', () => ({ familiesApi: api.families }))
vi.mock('../src/services/api/profiles.api', () => ({ profilesApi: api.profiles }))
vi.mock('../src/services/api/dashboard.api', () => ({ dashboardApi: api.dashboard }))
vi.mock('../src/services/api/permissions.api', () => ({ permissionsApi: api.permissions }))
vi.mock('@tarojs/taro', () => ({
  default: taro,
  useDidShow: (callback: () => void) => taro.didShowCallbacks.push(callback),
}))
vi.mock('@tarojs/components', async () => {
  const React = await import('react')
  type BasicProps = {
    children?: ReactNode
    className?: string
    onClick?: () => void
  }
  type ButtonProps = BasicProps & { disabled?: boolean; loading?: boolean }
  const basic = (tag: 'div' | 'span') =>
    ({ children, ...props }: BasicProps) => React.createElement(tag, props, children)
  return {
    View: basic('div'),
    Text: basic('span'),
    Button: ({ children, loading, ...props }: ButtonProps) =>
      React.createElement('button', { ...props, 'data-loading': String(Boolean(loading)) }, children),
  }
})

import FamilyPage from '../src/pages/family/index'
import { ACTIVE_PROFILE_STORAGE_KEY, useActiveProfileStore } from '../src/store/active-profile.store'
import { useSessionStore } from '../src/store/session.store'

const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT: boolean
}
actEnvironment.IS_REACT_ACT_ENVIRONMENT = true

const dashboard = {
  profile: { id: 'profile-1', familyId: 'family-1', name: '王阿姨', avatar: null, elderMode: true },
  latestRecord: {
    id: 'record-1',
    profileId: 'profile-1',
    systolic: 126,
    diastolic: 78,
    pulse: 70,
    measuredAt: '2026-09-09T01:00:00.000Z',
    source: 'family',
    recordedByUserId: 'user-1',
    measurementContext: null,
    note: null,
    attentionLevel: 'attention',
    ruleVersion: 'v1',
    createdAt: '2026-09-09T01:00:00.000Z',
    updatedAt: '2026-09-09T01:00:00.000Z',
  },
  measuredToday: true,
  todayTasks: [{ time: '08:00', status: 'completed' }],
  sevenDaySummary: { recordCount: 1, avgSystolic: 126, avgDiastolic: 78, attentionCount: 1 },
  attention: { level: 'attention', messageCode: 'BP_ATTENTION', requireRecheck: true, ruleVersion: 'v1' },
}

describe('FamilyPage', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    vi.clearAllMocks()
    taro.didShowCallbacks.length = 0
    taro.storage.clear()
    useActiveProfileStore.getState().clearSelection()
    useSessionStore.getState().clearSession()
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  async function renderPage(): Promise<void> {
    await act(async () => root.render(createElement(FamilyPage)))
    await act(async () => {
      taro.didShowCallbacks.forEach((callback) => callback())
      await Promise.resolve()
      await Promise.resolve()
    })
  }

  it('家庭没有成员时仍展示家庭并提供添加成员入口', async () => {
    api.families.list.mockResolvedValue([{ id: 'family-1', name: '温暖小家', avatar: null, ownerUserId: 'user-1', memberCount: 1 }])
    api.profiles.list.mockResolvedValue([])

    await renderPage()

    expect(container.textContent).toContain('温暖小家')
    expect(container.textContent).toContain('添加成员')
  })

  it('空账号提供创建家庭入口', async () => {
    api.families.list.mockResolvedValue([])
    api.profiles.list.mockResolvedValue([])

    await renderPage()

    expect(container.textContent).toContain('创建家庭')
  })

  it('未绑定账号成员照常展示，并复用 Dashboard 摘要展示长辈模式和关注状态', async () => {
    useSessionStore.getState().setSession('token-1', { userId: 'user-1', nickname: '小明', avatar: null })
    api.families.list.mockResolvedValue([{ id: 'family-1', name: '温暖小家', avatar: null, ownerUserId: 'user-1', memberCount: 1 }])
    api.profiles.list.mockResolvedValue([{ id: 'profile-1', familyId: 'family-1', name: '王阿姨', avatar: null, elderMode: true }])
    api.dashboard.get.mockResolvedValue(dashboard)
    api.permissions.list.mockResolvedValue([{ profileId: 'profile-1', userId: 'user-1', canView: true, canRecord: true, canManageReminder: true, canManageProfile: false, canReceiveAttention: true }])

    await renderPage()

    expect(container.textContent).toContain('王阿姨')
    expect(container.textContent).toContain('长辈模式')
    expect(container.textContent).toContain('126/78 mmHg')
    expect(container.textContent).toContain('今日已测')
    expect(container.textContent).toContain('建议关注')
    expect(container.textContent).not.toContain('编辑成员')
    expect(api.dashboard.get).toHaveBeenCalledWith('profile-1')
  })

  it('今日提醒已完成但服务端 measuredToday 为 false 时展示今日待测', async () => {
    api.families.list.mockResolvedValue([{ id: 'family-1', name: '温暖小家', avatar: null, ownerUserId: 'user-1', memberCount: 1 }])
    api.profiles.list.mockResolvedValue([{ id: 'profile-1', familyId: 'family-1', name: '王阿姨', avatar: null, elderMode: false }])
    api.dashboard.get.mockResolvedValue({ ...dashboard, measuredToday: false })
    api.permissions.list.mockResolvedValue([])

    await renderPage()

    expect(container.textContent).toContain('今日待测')
    expect(container.textContent).not.toContain('今日已测')
  })

  it('没有家庭成员关系时仍在共享分组展示显式授权档案', async () => {
    api.families.list.mockResolvedValue([])
    api.profiles.list.mockResolvedValue([{ id: 'shared-profile', familyId: 'hidden-family', name: '共享长辈', avatar: null, elderMode: true }])
    api.dashboard.get.mockResolvedValue({ ...dashboard, profile: { ...dashboard.profile, id: 'shared-profile', familyId: 'hidden-family', name: '共享长辈' } })
    api.permissions.list.mockRejectedValue(new Error('无管理权限'))

    await renderPage()

    expect(container.textContent).toContain('共享给我的成员')
    expect(container.textContent).toContain('共享长辈')
    expect(container.textContent).not.toContain('hidden-family')
  })

  it('当前用户有 canManageProfile 时展示编辑入口', async () => {
    useSessionStore.getState().setSession('token-1', { userId: 'user-1', nickname: '小明', avatar: null })
    api.families.list.mockResolvedValue([{ id: 'family-1', name: '温暖小家', avatar: null, ownerUserId: 'user-1', memberCount: 1 }])
    api.profiles.list.mockResolvedValue([{ id: 'profile-1', familyId: 'family-1', name: '王阿姨', avatar: null, elderMode: false }])
    api.dashboard.get.mockResolvedValue(dashboard)
    api.permissions.list.mockResolvedValue([{ profileId: 'profile-1', userId: 'user-1', canView: true, canRecord: true, canManageReminder: true, canManageProfile: true, canReceiveAttention: true }])

    await renderPage()

    expect(container.textContent).toContain('编辑成员')
  })

  it('切换成员时成对持久化 familyId 和 profileId', async () => {
    api.families.list.mockResolvedValue([{ id: 'family-1', name: '温暖小家', avatar: null, ownerUserId: 'user-1', memberCount: 1 }])
    api.profiles.list.mockResolvedValue([{ id: 'profile-1', familyId: 'family-1', name: '王阿姨', avatar: null, elderMode: false }])
    api.dashboard.get.mockResolvedValue({ ...dashboard, attention: null, todayTasks: [] })
    api.permissions.list.mockResolvedValue([])
    await renderPage()

    const member = [...container.querySelectorAll<HTMLElement>('[data-profile-id]')]
      .find((element) => element.dataset.profileId === 'profile-1')
    if (!member) throw new Error('未找到成员卡')
    await act(async () => member.click())

    expect(taro.storage.get(ACTIVE_PROFILE_STORAGE_KEY)).toEqual({
      activeFamilyId: 'family-1',
      activeProfileId: 'profile-1',
    })
    expect(taro.navigateTo).toHaveBeenCalledWith({
      url: '/pages/family-profile/index?profileId=profile-1',
    })
  })

  it('返回家庭页时保留已选择的共享成员与其 familyId', async () => {
    useActiveProfileStore.getState().selectProfile('hidden-family', 'shared-profile')
    api.families.list.mockResolvedValue([
      { id: 'family-1', name: '我的家庭', avatar: null, ownerUserId: 'user-1', memberCount: 1 },
    ])
    api.profiles.list.mockResolvedValue([
      { id: 'shared-profile', familyId: 'hidden-family', name: '共享成员', avatar: null, elderMode: false },
    ])
    api.dashboard.get.mockResolvedValue({
      ...dashboard,
      profile: { ...dashboard.profile, id: 'shared-profile', familyId: 'hidden-family', name: '共享成员' },
    })
    api.permissions.list.mockResolvedValue([])

    await renderPage()

    expect(taro.storage.get(ACTIVE_PROFILE_STORAGE_KEY)).toEqual({
      activeFamilyId: 'hidden-family',
      activeProfileId: 'shared-profile',
    })
  })

  it('单个 Dashboard 摘要失败时保留成员并明确展示降级状态', async () => {
    api.families.list.mockResolvedValue([{ id: 'family-1', name: '温暖小家', avatar: null, ownerUserId: 'user-1', memberCount: 1 }])
    api.profiles.list.mockResolvedValue([{ id: 'profile-1', familyId: 'family-1', name: '王阿姨', avatar: null, elderMode: false }])
    api.dashboard.get.mockRejectedValue(new Error('摘要服务暂不可用'))
    api.permissions.list.mockRejectedValue(new Error('无管理权限'))

    await renderPage()

    expect(container.textContent).toContain('王阿姨')
    expect(container.textContent).toContain('摘要暂不可用')
    expect(container.textContent).not.toContain('正常')
  })
})
