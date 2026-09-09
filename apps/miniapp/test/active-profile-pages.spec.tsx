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
    Image: (props: Record<string, unknown>) => React.createElement('img', props),
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

const record = (profileId: string, systolic: number, diastolic: number) => ({
  id: `record-${profileId}-${systolic}`,
  profileId,
  systolic,
  diastolic,
  pulse: 70,
  measuredAt: '2026-09-09T01:00:00.000Z',
  source: 'family' as const,
  recordedByUserId: 'user-1',
  measurementContext: null,
  note: null,
  attentionLevel: 'normal' as const,
  ruleVersion: 'v1',
  createdAt: '2026-09-09T01:00:00.000Z',
  updatedAt: '2026-09-09T01:00:00.000Z',
})

function deferred<T>(): {
  promise: Promise<T>
  resolve: (value: T) => void
} {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => { resolve = done })
  return { promise, resolve }
}

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

    expect(api.records.list).toHaveBeenCalledWith(expect.objectContaining({
      profileId: 'profile-b',
      from: expect.any(String),
      to: expect.any(String),
      limit: 50,
    }))
    expect(api.records.summary).toHaveBeenCalledWith('profile-b', '7d')
  })

  it('无成员选择时不静默使用第一位成员并引导用户选择', async () => {
    await renderPage(HomePage)

    expect(container.textContent).toContain('请先选择一位成员')
    expect(api.dashboard.get).not.toHaveBeenCalled()
    expect(api.records.list).not.toHaveBeenCalled()
  })

  it('首页忽略成员切换前较慢返回的请求结果', async () => {
    const slowA = deferred<ReturnType<typeof dashboard>>()
    api.dashboard.get.mockImplementation((profileId: string) => {
      if (profileId === 'profile-a') return slowA.promise
      return Promise.resolve({
        ...dashboard(profileId),
        latestRecord: record(profileId, 132, 84),
      })
    })
    useActiveProfileStore.getState().selectProfile('family-a', 'profile-a')
    await renderPage(HomePage)

    await selectB()
    await act(async () => { await Promise.resolve() })
    expect(container.textContent).toContain('132/84')

    await act(async () => {
      slowA.resolve({
        ...dashboard('profile-a'),
        latestRecord: record('profile-a', 118, 76),
      })
      await slowA.promise
      await Promise.resolve()
    })

    expect(container.textContent).toContain('132/84')
    expect(container.textContent).not.toContain('118/76')
  })

  it('历史页忽略成员切换前较慢返回的请求结果', async () => {
    const slowARecords = deferred<{ items: ReturnType<typeof record>[]; nextCursor: null }>()
    const slowASummary = deferred<typeof emptySummary>()
    api.records.list.mockImplementation(({ profileId }: { profileId: string }) =>
      profileId === 'profile-a'
        ? slowARecords.promise
        : Promise.resolve({ items: [record(profileId, 136, 86)], nextCursor: null }),
    )
    api.records.summary.mockImplementation((profileId: string) =>
      profileId === 'profile-a'
        ? slowASummary.promise
        : Promise.resolve({ recordCount: 1, avgSystolic: 136, avgDiastolic: 86, attentionCount: 0 }),
    )
    useActiveProfileStore.getState().selectProfile('family-a', 'profile-a')
    await renderPage(RecordHistoryPage)

    await selectB()
    await act(async () => { await Promise.resolve() })
    expect(container.textContent).toContain('136/86')

    await act(async () => {
      slowARecords.resolve({ items: [record('profile-a', 116, 74)], nextCursor: null })
      slowASummary.resolve({ recordCount: 1, avgSystolic: 116, avgDiastolic: 74, attentionCount: 0 })
      await Promise.all([slowARecords.promise, slowASummary.promise])
      await Promise.resolve()
    })

    expect(container.textContent).toContain('136/86')
    expect(container.textContent).not.toContain('116/74')
  })

  it('历史页为 7d 与 30d 列表请求传入对应时间范围', async () => {
    useActiveProfileStore.getState().selectProfile('family-a', 'profile-a')
    const before = Date.now()
    await renderPage(RecordHistoryPage)
    const after = Date.now()

    const firstQuery = api.records.list.mock.calls[0]?.[0]
    const firstTo = Date.parse(firstQuery?.to ?? '')
    const firstFrom = Date.parse(firstQuery?.from ?? '')
    expect(firstTo).toBeGreaterThanOrEqual(before)
    expect(firstTo).toBeLessThanOrEqual(after)
    expect(firstTo - firstFrom).toBe(7 * 24 * 60 * 60 * 1000)

    const rangeButtons = container.querySelectorAll<HTMLElement>('.history-page__range')
    await act(async () => {
      rangeButtons[1]?.click()
      await Promise.resolve()
      await Promise.resolve()
    })

    const secondQuery = api.records.list.mock.calls.at(-1)?.[0]
    expect(Date.parse(secondQuery.to) - Date.parse(secondQuery.from)).toBe(30 * 24 * 60 * 60 * 1000)
  })

  it('历史页平均值使用服务端 summary 而不是列表记录重算', async () => {
    useActiveProfileStore.getState().selectProfile('family-a', 'profile-a')
    api.records.list.mockResolvedValue({
      items: [record('profile-a', 100, 60), record('profile-a', 200, 100)],
      nextCursor: null,
    })
    api.records.summary.mockResolvedValue({
      recordCount: 2,
      avgSystolic: 125.5,
      avgDiastolic: 81.5,
      attentionCount: 0,
    })

    await renderPage(RecordHistoryPage)

    const average = container.querySelector<HTMLElement>('.history-page__stat-value')
    expect(average?.textContent).toBe('125.5/81.5')
  })

  it('历史页忽略切换范围前较慢返回的请求结果', async () => {
    const slowSevenRecords = deferred<{ items: ReturnType<typeof record>[]; nextCursor: null }>()
    const slowSevenSummary = deferred<typeof emptySummary>()
    api.records.list
      .mockImplementationOnce(() => slowSevenRecords.promise)
      .mockResolvedValueOnce({ items: [record('profile-a', 139, 89)], nextCursor: null })
    api.records.summary
      .mockImplementationOnce(() => slowSevenSummary.promise)
      .mockResolvedValueOnce({ recordCount: 1, avgSystolic: 139, avgDiastolic: 89, attentionCount: 0 })
    useActiveProfileStore.getState().selectProfile('family-a', 'profile-a')
    await renderPage(RecordHistoryPage)

    const rangeButtons = container.querySelectorAll<HTMLElement>('.history-page__range')
    await act(async () => {
      rangeButtons[1]?.click()
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(container.textContent).toContain('139/89')

    await act(async () => {
      slowSevenRecords.resolve({ items: [record('profile-a', 111, 71)], nextCursor: null })
      slowSevenSummary.resolve({ recordCount: 1, avgSystolic: 111, avgDiastolic: 71, attentionCount: 0 })
      await Promise.all([slowSevenRecords.promise, slowSevenSummary.promise])
      await Promise.resolve()
    })

    expect(container.textContent).toContain('139/89')
    expect(container.textContent).not.toContain('111/71')
  })
})
