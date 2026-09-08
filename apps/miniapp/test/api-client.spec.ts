import type { ApiError } from '@bp/contracts'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const taro = vi.hoisted(() => {
  const storage = new Map<string, unknown>()

  return {
    storage,
    getStorageSync: vi.fn((key: string) => storage.get(key)),
    setStorageSync: vi.fn((key: string, value: unknown) => storage.set(key, value)),
    removeStorageSync: vi.fn((key: string) => storage.delete(key)),
    reLaunch: vi.fn(async () => ({ errMsg: 'reLaunch:ok' })),
    request: vi.fn(),
  }
})

vi.mock('@tarojs/taro', () => ({ default: taro }))

import { ApiRequestError, apiClient, createApiClient } from '../src/services/api/client'
import { SESSION_STORAGE_KEY, useSessionStore } from '../src/store/session.store'

const user = { userId: 'user-1' }

describe('apiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    taro.storage.clear()
    useSessionStore.getState().clearSession()
  })

  it('为已登录请求注入 Bearer token，并使用本地默认 API 地址', async () => {
    useSessionStore.getState().setSession('token-1', user)
    taro.request.mockResolvedValueOnce({ statusCode: 200, data: { ok: true } })

    await expect(apiClient.get<{ ok: boolean }>('/health')).resolves.toEqual({ ok: true })
    expect(taro.request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'http://127.0.0.1:3000/api/v1/health',
        method: 'GET',
        header: expect.objectContaining({ Authorization: 'Bearer token-1' }),
      }),
    )
  })

  it('允许为不同环境配置 API 地址', async () => {
    let requestedUrl = ''
    const client = createApiClient({
      baseUrl: 'https://api.jiaya.example/api/v1/',
      getAccessToken: () => null,
      onUnauthorized: () => undefined,
      request: async (options) => {
        requestedUrl = options.url
        return { statusCode: 200, data: { ok: true } }
      },
    })

    await client.get('/health')

    expect(requestedUrl).toBe('https://api.jiaya.example/api/v1/health')
  })

  it.each([
    [401, 'AUTH_REQUIRED'],
    [403, 'TOKEN_EXPIRED'],
  ] as const)('收到 %s/%s 时清空内存与持久化 session 并返回登录页', async (statusCode, code) => {
    useSessionStore.getState().setSession('expired-token', user)
    const response: ApiError = { code, message: '登录已失效', requestId: 'request-1' }
    taro.request.mockResolvedValueOnce({ statusCode, data: response })

    const request = apiClient.get('/users/me')

    await expect(request).rejects.toMatchObject({
      code,
      message: '登录已失效',
      requestId: 'request-1',
      statusCode,
    } satisfies Partial<ApiRequestError>)
    expect(useSessionStore.getState()).toMatchObject({ accessToken: null, currentUser: null })
    expect(taro.storage.has(SESSION_STORAGE_KEY)).toBe(false)
    expect(taro.reLaunch).toHaveBeenCalledWith({ url: '/pages/login/index' })
  })
})
