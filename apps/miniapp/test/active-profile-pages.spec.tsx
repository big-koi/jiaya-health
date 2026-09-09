// @vitest-environment jsdom

import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  profiles: { list: vi.fn() },
  dashboard: { get: vi.fn() },
  records: { list: vi.fn(), summary: vi.fn(), create: vi.fn() },
}))
const taro = vi.hoisted(() => {
  const storage = new Map<string, unknown>()
  return {
    storage,
    didShowCallbacks: [] as Array<() => void>,
    getStorageSync: vi.fn((key: string) => storage.get(key)),
    setStorageSync: vi.fn((key: string, value: unknown) => storage.set(key, value)),
    removeStorageSync: vi.fn((key: string) => storage.delete(key)),
    showToast: vi.fn(async () => ({ errMsg: 'showToast:ok' })),
    navigateTo: vi.fn(async () => ({ errMsg: 'navigateTo:ok' })),
    switchTab: vi.fn(async () => ({ errMsg: 'switchTab:ok' })),
  }
})

vi.mock('../src/services/api/profiles.api', () => ({ profilesApi: api.profiles }))
vi.mock('../src/services/api/dashboard.api', () => ({ dashboardApi: api.dashboard }))
vi.mock('../src/services/api/records.api', () => ({ recordsApi: api.records }))
vi.mock('@tarojs/taro', () => ({
  default: taro,
  useDidShow: (callback: () => void) => taro.didShowCallbacks.push(callback),
}))
vi.mock('@tarojs/components', async () => {
  const React = await import('react')
  type BasicProps = { children?: ReactNode; className?: string; onClick?: () => void }
  type InputProps = BasicProps & {
    value?: string
    placeholder?: string
    maxlength?: number
    onInput?: (event: { detail: { value: string } }) => void
  }
  type ButtonProps = BasicProps & { disabled?: boolean; loading?: boolean }
  const basic = (tag: 'div' | 'span') =>
    ({ children, ...props }: BasicProps) => React.createElement(tag, props, children)
  return {
    View: basic('div'),
    Text: basic('span'),
    Button: ({ children, loading, ...props }: ButtonProps) =>
      React.createElement('button', { ...props, 'data-loading': String(Boolean(loading)) }, children),
    Input: ({ onInput, maxlength, ...props }: InputProps) => React.createElement('input', {
      ...props,
      maxLength: maxlength,
      onInput: (event: { currentTarget: { value: string } }) =>
        onInput?.({ detail: { value: event.currentTarget.value } }),
    }),
    Textarea: ({ onInput, maxlength, ...props }: InputProps) => React.createElement('textarea', {
      ...props,
      maxLength: maxlength,
      onInput: (event: { currentTarget: { value: string } }) =>
        onInput?.({ detail: { value: event.currentTarget.value } }),
    }),
    Picker: ({ children }: BasicProps) => React.createElement('div', {}, children),
  }
})

import HomePage from '../src/pages/home/index'
import RecordCreatePage from '../src/pages/record-create/index'
import RecordHistoryPage from '../src/pages/record-history/index'
import { useActiveProfileStore } from '../src/store/active-profile.store'

const profiles = [
  { id: 'profile-a', familyId: 'family-a', name: '成员甲', avatar: null, elderMode: false },
  { id: 'profile-b', familyId: 'family-b', name: '成员乙', avatar: null, elderMode: false },
]
const emptySummary = { recordCount: 0, avgSystolic: null, avgDiastolic: null, attentionCount: 0 }
const dashboard = (profileId: string) => ({
  profile: profiles.find((profile) => profile.id === profileId) ?? profiles[0],
  measuredToday: false,
  latestRecord: null,
  todayTasks: [],
  sevenDaySummary: emptySummary,
  attention: null,
})

const actEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
actEnvironment.IS_REACT_ACT_ENVIRONMENT = true

describe('active profile data pages', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    vi.clearAllMocks()
    taro.storage.clear()
    taro.didShowCallbacks.length = 0
    useActiveProfileStore.getState().clearSelection()
    api.profiles.list.mockResolvedValue(profiles)
    api.dashboard.get.mockImplementation(async (profileId: string) => dashboard(profileId))
    api.records.list.mockResolvedValue({ items: [], nextCursor: null })
    api.records.summary.mockResolvedValue(emptySummary)
    api.records.create.mockResolvedValue({
      record: { id: 'record-1' },
      attention: { level: 'normal', messageCode: 'BP_NORMAL', requireRecheck: false, ruleVersion: 'v1' },
    })
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  async function renderPage(page: () => JSX.Element): Promise<void> {
    await act(async () => root.render(createElement(page)))
    await act(async () => {
      taro.didShowCallbacks.forEach((callback) => callback())
      await Promise.resolve()
      await Promise.resolve()
    })
  }

  async function selectB(): Promise<void> {
    await act(async () => {
      useActiveProfileStore.getState().selectProfile('family-b', 'profile-b')
      await Promise.resolve()
      await Promise.resolve()
    })
  }

  it('首页订阅成员切换并用新的 profileId 重新请求 Dashboard 和记录', async () => {
    useActiveProfileStore.getState().selectProfile('family-a', 'profile-a')
    await renderPage(HomePage)
    vi.clearAllMocks()

    await selectB()

    expect(api.dashboard.get).toHaveBeenCalledWith('profile-b')
    expect(api.records.list).toHaveBeenCalledWith({ profileId: 'profile-b', limit: 5 })
    expect(api.dashboard.get).toHaveBeenCalledTimes(1)
    expect(api.records.list).toHaveBeenCalledTimes(1)
  })

  it('录入页订阅成员切换并把新的 profileId 写入创建请求', async () => {
    useActiveProfileStore.getState().selectProfile('family-a', 'profile-a')
    await renderPage(RecordCreatePage)
    await selectB()
    const inputs = container.querySelectorAll<HTMLInputElement>('input')
    await act(async () => {
      inputs[0]!.value = '128'
      inputs[0]!.dispatchEvent(new Event('input', { bubbles: true }))
      inputs[1]!.value = '82'
      inputs[1]!.dispatchEvent(new Event('input', { bubbles: true }))
    })
    const save = [...container.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent?.includes('保存记录'))
    if (!save) throw new Error('未找到保存按钮')

    await act(async () => {
      save.click()
      await Promise.resolve()
    })

    expect(api.records.create).toHaveBeenCalledWith(expect.objectContaining({ profileId: 'profile-b' }))
  })

  it('历史页订阅成员切换并用新的 profileId 请求列表与汇总', async () => {
    useActiveProfileStore.getState().selectProfile('family-a', 'profile-a')
    await renderPage(RecordHistoryPage)
    vi.clearAllMocks()

    await selectB()

    expect(api.records.list).toHaveBeenCalledWith({ profileId: 'profile-b', limit: 50 })
    expect(api.records.summary).toHaveBeenCalledWith('profile-b', '7d')
  })

  it('无成员选择时不静默使用第一位成员并引导用户选择', async () => {
    await renderPage(HomePage)

    expect(container.textContent).toContain('请先选择一位成员')
    expect(api.dashboard.get).not.toHaveBeenCalled()
    expect(api.records.list).not.toHaveBeenCalled()
  })
})
