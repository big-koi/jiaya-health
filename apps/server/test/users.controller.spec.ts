import type { UserDTO } from '@bp/contracts'
import { describe, expect, it, vi } from 'vitest'

import { UsersController } from '../src/auth/users.controller'
import { AuthService } from '../src/auth/auth.service'

describe('UsersController', () => {
  it('当前用户接口返回共享 UserDTO，而不是 JWT 载荷', async () => {
    const user: UserDTO = {
      id: 'user-1',
      nickname: '小明',
      avatar: null,
      phone: null,
      status: 'active',
      createdAt: '2026-09-09T00:00:00.000Z',
      updatedAt: '2026-09-09T00:00:00.000Z',
    }
    const authService = { getCurrentUser: vi.fn(async () => user) }
    const controller = new (UsersController as unknown as new (service: typeof authService) => UsersController)(authService)

    await expect(controller.me({ userId: 'user-1' })).resolves.toEqual(user)
    expect(authService.getCurrentUser).toHaveBeenCalledWith('user-1')
  })

  it('JWT 对应用户已不存在时返回可触发客户端清理 session 的 401', async () => {
    const service = new AuthService(
      { exchangeCode: vi.fn() } as never,
      { user: { findUnique: vi.fn(async () => null) } } as never,
      { signAsync: vi.fn() } as never,
    )

    const error = await service.getCurrentUser('deleted-user').catch((cause: unknown) => cause)

    expect(error).toMatchObject({ response: { code: 'AUTH_REQUIRED' } })
    expect((error as { getStatus: () => number }).getStatus()).toBe(401)
  })
})
