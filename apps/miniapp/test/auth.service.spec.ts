import type { WechatLoginResponse } from '@bp/contracts'
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

import { createAuthService } from '../src/features/auth/auth.service'
import {
  ACTIVE_PROFILE_STORAGE_KEY,
  useActiveProfileStore,
} from '../src/store/active-profile.store'
import { SESSION_STORAGE_KEY, useSessionStore } from '../src/store/session.store'

const loginResponse: WechatLoginResponse = {
  accessToken: 'wechat-access-token',
  user: {
    id: 'user-1',
    nickname: '',
    avatar: null,
    phone: null,
    status: 'active',
    createdAt: '2026-09-08T00:00:00.000Z',
    updatedAt: '2026-09-08T00:00:00.000Z',
  },
}

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    taro.storage.clear()
    useSessionStore.getState().clearSession()
  })

  it('按微信 code、登录接口、当前用户接口的顺序建立持久化 session', async () => {
    const calls: string[] = []
    const service = createAuthService({
      login: async () => {
        calls.push('taro.login')
        return { code: 'wechat-code' }
      },
      apiClient: {
        post: async (path, data) => {
          calls.push(`post:${path}:${JSON.stringify(data)}`)
          return loginResponse
        },
        get: async (path) => {
          calls.push(`get:${path}:token=${useSessionStore.getState().accessToken}`)
          return { userId: 'user-1' }
        },
      },
    })

    await expect(service.loginWithWechat()).resolves.toEqual({ userId: 'user-1' })
    expect(calls).toEqual([
      'taro.login',
      'post:/auth/wechat:{"code":"wechat-code"}',
      'get:/users/me:token=wechat-access-token',
    ])
    expect(useSessionStore.getState()).toMatchObject({
      accessToken: 'wechat-access-token',
      currentUser: { userId: 'user-1' },
    })
    expect(taro.storage.get(SESSION_STORAGE_KEY)).toEqual({
      accessToken: 'wechat-access-token',
      currentUser: { userId: 'user-1' },
    })
  })

  it('获取当前用户失败时清除已暂存的 token', async () => {
    const service = createAuthService({
      login: async () => ({ code: 'wechat-code' }),
      apiClient: {
        post: async () => loginResponse,
        get: async () => {
          throw new Error('无法获取当前用户')
        },
      },
    })

    await expect(service.loginWithWechat()).rejects.toThrow('无法获取当前用户')
    expect(useSessionStore.getState()).toMatchObject({ accessToken: null, currentUser: null })
    expect(taro.storage.has(SESSION_STORAGE_KEY)).toBe(false)
  })

  it('账号 A 成功切换登录账号 B 时不继承账号 A 的档案选择', async () => {
    useSessionStore.getState().setSession('token-a', { userId: 'user-a' })
    useActiveProfileStore.getState().selectProfile('family-a', 'profile-a')
    const service = createAuthService({
      login: async () => ({ code: 'wechat-code-b' }),
      apiClient: {
        post: async () => ({
          ...loginResponse,
          accessToken: 'token-b',
          user: { ...loginResponse.user, id: 'user-b' },
        }),
        get: async () => ({ userId: 'user-b' }),
      },
    })

    await service.loginWithWechat()

    expect(useSessionStore.getState()).toMatchObject({
      accessToken: 'token-b',
      currentUser: { userId: 'user-b' },
    })
    expect(useActiveProfileStore.getState()).toMatchObject({
      activeFamilyId: null,
      activeProfileId: null,
    })
    expect(taro.storage.has(ACTIVE_PROFILE_STORAGE_KEY)).toBe(false)
  })
})
