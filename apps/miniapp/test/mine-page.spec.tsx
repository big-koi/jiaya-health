// @vitest-environment jsdom

import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const session = vi.hoisted(() => ({
  currentUser: null as { userId: string; nickname: string; avatar: string | null } | null,
  clearSession: vi.fn(),
}))

vi.mock('../src/store/session.store', () => ({
  useSessionStore: (selector: (state: typeof session) => unknown) => selector(session),
}))
vi.mock('@tarojs/taro', () => ({
  default: {
    showToast: vi.fn(),
    showModal: vi.fn(),
    switchTab: vi.fn(),
    navigateTo: vi.fn(),
    reLaunch: vi.fn(),
  },
}))
vi.mock('@tarojs/components', async () => {
  const React = await import('react')
  const basic = (tag: 'div' | 'span') =>
    ({ children, ...props }: { children?: ReactNode }) => React.createElement(tag, props, children)
  return { View: basic('div'), Text: basic('span') }
})

import MinePage from '../src/pages/mine/index'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

describe('MinePage', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    vi.clearAllMocks()
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  it('已登录用户昵称为空时显示默认用户名称而不是未登录', async () => {
    session.currentUser = { userId: 'user-1', nickname: '', avatar: null }

    await act(async () => root.render(createElement(MinePage)))

    expect(container.textContent).toContain('微信用户')
    expect(container.textContent).not.toContain('未登录')
  })
})
