import { describe, expect, it } from 'vitest'
import type { ServiceStatus } from '@bp/contracts'

describe('miniapp foundation', () => {
  it('consumes the shared service status contract', () => {
    const status: ServiceStatus = {
      status: 'ok',
      service: 'jiaya-health-miniapp',
    }

    expect(status.status).toBe('ok')
  })
})
