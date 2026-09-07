import { describe, expect, it } from 'vitest'
import type { ServiceStatus } from './index'

describe('ServiceStatus', () => {
  it('describes a healthy workspace service', () => {
    const result: ServiceStatus = { status: 'ok', service: 'server' }
    expect(result).toEqual({ status: 'ok', service: 'server' })
  })
})
