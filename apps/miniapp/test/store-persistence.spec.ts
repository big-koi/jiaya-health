import { beforeEach, describe, expect, it, vi } from 'vitest'

const taro = vi.hoisted(() => {
  const storage = new Map<string, unknown>()

  return {
    storage,
    getStorageSync: vi.fn((key: string) => storage.get(key)),
    setStorageSync: vi.fn((key: string, value: unknown) => storage.set(key, value)),
    removeStorageSync: vi.fn((key: string) => storage.delete(key)),
  }
})

vi.mock('@tarojs/taro', () => ({ default: taro }))

describe('账号状态持久化恢复', () => {
  beforeEach(() => {
    taro.storage.clear()
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('模块重新加载时恢复 session 与 active profile 标识', async () => {
    taro.storage.set('jiaya.session', {
      accessToken: 'persisted-token',
      currentUser: { userId: 'persisted-user' },
    })
    taro.storage.set('jiaya.active-profile', {
      activeFamilyId: 'persisted-family',
      activeProfileId: 'persisted-profile',
    })

    const { useSessionStore } = await import('../src/store/session.store')
    const { useActiveProfileStore } = await import('../src/store/active-profile.store')

    expect(useSessionStore.getState()).toMatchObject({
      accessToken: 'persisted-token',
      currentUser: { userId: 'persisted-user' },
    })
    expect(useActiveProfileStore.getState()).toMatchObject({
      activeFamilyId: 'persisted-family',
      activeProfileId: 'persisted-profile',
    })
  })

  it('损坏的持久化内容安全降级为空状态', async () => {
    taro.storage.set('jiaya.session', {
      accessToken: 42,
      currentUser: { userId: ['invalid'] },
    })
    taro.storage.set('jiaya.active-profile', {
      activeFamilyId: { invalid: true },
      activeProfileId: ['invalid'],
    })

    const { useSessionStore } = await import('../src/store/session.store')
    const { useActiveProfileStore } = await import('../src/store/active-profile.store')

    expect(useSessionStore.getState()).toMatchObject({
      accessToken: null,
      currentUser: null,
    })
    expect(useActiveProfileStore.getState()).toMatchObject({
      activeFamilyId: null,
      activeProfileId: null,
    })
  })
})
