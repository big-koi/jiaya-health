import type { UserDTO } from '@bp/contracts'
import { describe, expect, it, vi } from 'vitest'

import { UsersController } from '../src/auth/users.controller'

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
})
