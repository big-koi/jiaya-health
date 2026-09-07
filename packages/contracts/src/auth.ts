export type UserStatus = 'active' | 'disabled'

export type UserDTO = {
  id: string
  nickname: string
  avatar: string | null
  phone: string | null
  status: UserStatus
  createdAt: string
  updatedAt: string
}

export type WechatLoginRequest = {
  code: string
}

export type WechatLoginResponse = {
  accessToken: string
  user: UserDTO
}
