import type { WechatLoginRequest, WechatLoginResponse } from '@bp/contracts'
import Taro from '@tarojs/taro'

import { apiClient } from '../../services/api/client'
import { type CurrentUser, useSessionStore } from '../../store/session.store'

type AuthApiClient = {
  post: (path: string, data: WechatLoginRequest) => Promise<WechatLoginResponse>
  get: (path: string) => Promise<CurrentUser>
}

type AuthServiceDependencies = {
  login: () => Promise<{ code: string }>
  apiClient: AuthApiClient
}

export type AuthService = {
  loginWithWechat: () => Promise<CurrentUser>
}

export function createAuthService(dependencies: AuthServiceDependencies): AuthService {
  return {
    loginWithWechat: async () => {
      const { code } = await dependencies.login()
      if (!code) throw new Error('未能获取微信登录凭证，请重试')

      const { accessToken } = await dependencies.apiClient.post('/auth/wechat', { code })
      useSessionStore.getState().setAccessToken(accessToken)

      try {
        const currentUser = await dependencies.apiClient.get('/users/me')
        useSessionStore.getState().setSession(accessToken, currentUser)
        return currentUser
      } catch (error) {
        useSessionStore.getState().clearSession()
        throw error
      }
    },
  }
}

export const authService = createAuthService({
  login: async () => Taro.login(),
  apiClient: {
    post: (path, data) => apiClient.post<WechatLoginResponse>(path, data),
    get: (path) => apiClient.get<CurrentUser>(path),
  },
})
