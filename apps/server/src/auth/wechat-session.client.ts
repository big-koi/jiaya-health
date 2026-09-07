import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common'

export const WECHAT_SESSION_CLIENT = 'WECHAT_SESSION_CLIENT'

export type WechatSession = {
  openid: string
  unionid?: string
}

export interface WechatSessionClient {
  exchangeCode(code: string): Promise<WechatSession>
}

type WechatApiResponse = {
  openid?: string
  unionid?: string
  errcode?: number
  errmsg?: string
}

@Injectable()
export class WechatApiSessionClient implements WechatSessionClient {
  async exchangeCode(code: string): Promise<WechatSession> {
    const appId = process.env.WECHAT_APP_ID
    const appSecret = process.env.WECHAT_APP_SECRET
    if (!appId || !appSecret) {
      throw new ServiceUnavailableException({ code: 'INTERNAL_ERROR', message: '微信登录尚未配置' })
    }

    const url = new URL('https://api.weixin.qq.com/sns/jscode2session')
    url.search = new URLSearchParams({
      appid: appId,
      secret: appSecret,
      js_code: code,
      grant_type: 'authorization_code',
    }).toString()
    const response = await fetch(url)
    const session = (await response.json()) as WechatApiResponse
    if (!response.ok || !session.openid || session.errcode) {
      throw new ServiceUnavailableException({ code: 'INTERNAL_ERROR', message: '微信登录失败，请稍后重试' })
    }

    return { openid: session.openid, ...(session.unionid ? { unionid: session.unionid } : {}) }
  }
}

export const InjectWechatSessionClient = () => Inject(WECHAT_SESSION_CLIENT)
