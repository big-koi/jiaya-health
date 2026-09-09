import { describe, expect, it } from 'vitest'
import type { ServiceStatus } from '@bp/contracts'
import { readFileSync } from 'node:fs'
import { attentionLabelMap, demoMembers, demoRecords } from '../src/mocks/demo-data'

describe('miniapp foundation', () => {
  it('consumes the shared service status contract', () => {
    const status: ServiceStatus = {
      status: 'ok',
      service: 'jiaya-health-miniapp',
    }

    expect(status.status).toBe('ok')
  })

  it('provides demo data for ui preview', () => {
    expect(demoMembers.length).toBeGreaterThan(0)
    expect(demoRecords[0]?.attentionLevel).toBe('normal')
    expect(attentionLabelMap.attention).toBe('建议关注')
  })

  it('使用微信开发者工具支持的 ECMAScript 编译目标', () => {
    const tsconfig = JSON.parse(
      readFileSync(new URL('../tsconfig.json', import.meta.url), 'utf8'),
    ) as { compilerOptions?: { target?: string } }

    expect(tsconfig.compilerOptions?.target).toBe('ES2020')
  })

  it('注册家庭创建、成员添加和成员详情页面', () => {
    const source = readFileSync(new URL('../src/app.config.ts', import.meta.url), 'utf8')

    expect(source).toContain("'pages/family-create/index'")
    expect(source).toContain("'pages/family-profile-add/index'")
    expect(source).toContain("'pages/family-profile/index'")
  })
})
