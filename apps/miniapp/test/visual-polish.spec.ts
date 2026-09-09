import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = (path: string): string =>
  readFileSync(resolve(process.cwd(), path), 'utf8')

describe('第二轮小程序视觉精修', () => {
  it('首页使用语义图标和数据卡片装饰，而不是单字占位图标', () => {
    const page = source('src/pages/home/index.tsx')
    expect(page).toContain("icon: '＋'")
    expect(page).toContain("icon: '⌁'")
    expect(page).toContain('home-page__latest-orbit')
    expect(page).not.toContain('action.label.slice(0, 1)')
  })

  it('家庭成员卡展示身份关系并提供清晰的进入提示', () => {
    const card = source('src/features/family/FamilyMemberCard.tsx')
    expect(card).toContain('family-member-card__relation')
    expect(card).toContain('family-member-card__chevron')
  })

  it('个人中心菜单使用独立图标并移除开发版本文案', () => {
    const page = source('src/pages/mine/index.tsx')
    expect(page).toContain('mine-page__item-icon')
    expect(page).toContain('mine-page__brand-mark')
    expect(page).not.toContain('接口联调版')
  })

  it('血压录入使用底部操作区并明确三项数值含义', () => {
    const page = source('src/pages/record-create/index.tsx')
    expect(page).toContain('record-page__value-row')
    expect(page).toContain('record-page__actions')
    expect(page).toContain('高压')
    expect(page).toContain('低压')
  })

  it('登录页具备完整品牌口号与轻量浮层操作区', () => {
    const page = source('src/pages/login/index.tsx')
    const styles = source('src/pages/login/index.scss')
    expect(page).toContain('用记录，守护家人的健康')
    expect(page).toContain('login-page__hero-frame')
    expect(styles).toContain('backdrop-filter')
  })
})
