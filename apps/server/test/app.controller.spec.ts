import { describe, expect, it } from 'vitest'
import { AppController } from '../src/app.controller'

describe('AppController', () => {
  it('exposes the server health status', () => {
    expect(new AppController().health()).toEqual({
      status: 'ok',
      service: 'jiaya-health-server',
    })
  })
})
