import type { ApiError, ApiErrorCode } from '@bp/contracts'
import Taro from '@tarojs/taro'

import { useSessionStore } from '../../store/session.store'

export const DEFAULT_API_BASE_URL = 'http://127.0.0.1:3000/api/v1'

const API_ERROR_CODE_LOOKUP: Record<ApiErrorCode, true> = {
  AUTH_REQUIRED: true,
  TOKEN_EXPIRED: true,
  FAMILY_NOT_FOUND: true,
  PROFILE_NOT_FOUND: true,
  PROFILE_VIEW_FORBIDDEN: true,
  PROFILE_RECORD_FORBIDDEN: true,
  PROFILE_MANAGE_FORBIDDEN: true,
  INVALID_BP_READING: true,
  RECORD_NOT_FOUND: true,
  REMINDER_NOT_FOUND: true,
  DUPLICATE_MEMBERSHIP: true,
  INTERNAL_ERROR: true,
}

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE'

type TransportOptions = {
  url: string
  method: HttpMethod
  data?: unknown
  header: Record<string, string>
}

type TransportResponse = {
  statusCode: number
  data: unknown
  header?: Record<string, string>
}

type ApiClientDependencies = {
  baseUrl: string
  getAccessToken: () => string | null
  onUnauthorized: () => void | Promise<void>
  request: (options: TransportOptions) => Promise<TransportResponse>
}

export class ApiRequestError extends Error implements ApiError {
  readonly code: ApiErrorCode
  readonly requestId: string
  readonly details?: Record<string, unknown>
  readonly statusCode: number

  constructor(error: ApiError, statusCode: number) {
    super(error.message)
    this.name = 'ApiRequestError'
    this.code = error.code
    this.requestId = error.requestId
    this.details = error.details
    this.statusCode = statusCode
  }
}

export type ApiClient = {
  get: <T>(path: string, data?: unknown) => Promise<T>
  post: <T>(path: string, data?: unknown) => Promise<T>
  patch: <T>(path: string, data?: unknown) => Promise<T>
  delete: <T>(path: string, data?: unknown) => Promise<T>
}

function apiUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`
}

function isApiErrorCode(value: unknown): value is ApiErrorCode {
  return (
    typeof value === 'string' && Object.prototype.hasOwnProperty.call(API_ERROR_CODE_LOOKUP, value)
  )
}

function parseApiError(data: unknown, statusCode: number, headers?: Record<string, string>): ApiError {
  const body = data && typeof data === 'object' ? (data as Partial<ApiError>) : {}
  const requestIdHeader = Object.entries(headers ?? {}).find(
    ([key]) => key.toLowerCase() === 'x-request-id',
  )?.[1]

  return {
    code: isApiErrorCode(body.code) ? body.code : 'INTERNAL_ERROR',
    message: typeof body.message === 'string' ? body.message : '服务暂时不可用',
    requestId: typeof body.requestId === 'string' ? body.requestId : (requestIdHeader ?? ''),
    ...(body.details && typeof body.details === 'object' && !Array.isArray(body.details)
      ? { details: body.details }
      : {}),
  }
}

export function createApiClient(dependencies: ApiClientDependencies): ApiClient {
  async function request<T>(method: HttpMethod, path: string, data?: unknown): Promise<T> {
    let response: TransportResponse
    try {
      const accessToken = dependencies.getAccessToken()
      response = await dependencies.request({
        url: apiUrl(dependencies.baseUrl, path),
        method,
        ...(data === undefined ? {} : { data }),
        header: {
          'content-type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      })
    } catch (cause) {
      throw new ApiRequestError(
        {
          code: 'INTERNAL_ERROR',
          message: cause instanceof Error ? cause.message : '网络连接失败，请稍后重试',
          requestId: '',
        },
        0,
      )
    }

    if (response.statusCode >= 200 && response.statusCode < 300) return response.data as T

    const error = parseApiError(response.data, response.statusCode, response.header)
    if (response.statusCode === 401 || error.code === 'TOKEN_EXPIRED') {
      await dependencies.onUnauthorized()
    }
    throw new ApiRequestError(error, response.statusCode)
  }

  return {
    get: <T>(path: string, data?: unknown) => request<T>('GET', path, data),
    post: <T>(path: string, data?: unknown) => request<T>('POST', path, data),
    patch: <T>(path: string, data?: unknown) => request<T>('PATCH', path, data),
    delete: <T>(path: string, data?: unknown) => request<T>('DELETE', path, data),
  }
}

const configuredBaseUrl = process.env.TARO_APP_API_BASE_URL?.trim() || DEFAULT_API_BASE_URL

export const apiClient = createApiClient({
  baseUrl: configuredBaseUrl,
  getAccessToken: () => useSessionStore.getState().accessToken,
  onUnauthorized: () => {
    useSessionStore.getState().clearSession()
    void Taro.reLaunch({ url: '/pages/login/index' })
  },
  request: async (options) =>
    Taro.request({
      url: options.url,
      method: options.method,
      data: options.data,
      header: options.header,
    }) as Promise<TransportResponse>,
})
