// @vitest-environment jsdom

import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const auth = vi.hoisted(() => ({
  loginWithWechat: vi.fn<() => Promise<{ userId: string }>>(),
}))

const session = vi.hoisted(() => ({
  currentUser: null as { userId: string } | null,
}))

const taro = vi.hoisted(() => ({
  showToast: vi.fn(async () => ({ errMsg: 'showToast:ok' })),
  switchTab: vi.fn(async () => ({ errMsg: 'switchTab:ok' })),
  readyCallbacks: [] as Array<() => void>,
}))

vi.mock('../src/features/auth/auth.service', () => ({ authService: auth }))
vi.mock('../src/store/session.store', () => ({
  useSessionStore: (selector: (state: typeof session) => unknown) => selector(session),
}))
vi.mock('@tarojs/taro', () => ({
  default: taro,
  useReady: (callback: () => void) => taro.readyCallbacks.push(callback),
}))
vi.mock('@tarojs/components', async () => {
  const React = await import('react')
  type BasicProps = { children?: ReactNode; className?: string }
  type ButtonProps = BasicProps & {
    disabled?: boolean
    loading?: boolean
    onClick?: () => void
  }
  type CheckboxProps = BasicProps & {
    checked?: boolean
  }
  type CheckboxGroupProps = BasicProps & {
    onChange?: (event: { detail: { value: string[] } }) => void
  }

  const basic = (tag: 'div' | 'span' | 'label') =>
    ({ children, ...props }: BasicProps) => React.createElement(tag, props, children)

  return {
    View: basic('div'),
    Text: basic('span'),
    Label: basic('label'),
    Button: ({ children, loading, ...props }: ButtonProps) =>
      React.createElement('button', { ...props, 'data-loading': String(Boolean(loading)) }, children),
    Checkbox: ({ checked, ...props }: CheckboxProps) =>
      React.createElement('span', { ...props, 'data-checked': String(Boolean(checked)) }),
    CheckboxGroup: ({ children, onChange, ...props }: CheckboxGroupProps) =>
      React.createElement(
        'div',
        {
          ...props,
          'data-testid': 'agreement',
          onClick: () => onChange?.({ detail: { value: ['agreed'] } }),
        },
        children,
      ),
    Image: (props: { src: string; className?: string }) => React.createElement('img', props),
  }
})

import LoginPage from '../src/pages/login/index'

const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT: boolean
}
actEnvironment.IS_REACT_ACT_ENVIRONMENT = true

describe('LoginPage', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    vi.clearAllMocks()
    taro.readyCallbacks.length = 0
    session.currentUser = null
    auth.loginWithWechat.mockResolvedValue({ userId: 'user-1' })
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  async function renderPage(): Promise<void> {
    await act(async () => root.render(createElement(LoginPage)))
  }

  async function agree(): Promise<void> {
    const agreement = container.querySelector<HTMLElement>('[data-testid="agreement"]')
    if (!agreement) throw new Error('未找到协议选择控件')
    await act(async () => agreement.click())
  }

  async function clickLogin(): Promise<void> {
    const button = container.querySelector<HTMLButtonElement>('button')
    if (!button) throw new Error('未找到登录按钮')
    await act(async () => {
      button.click()
      await Promise.resolve()
    })
  }

  it('保留法律文案并在未同意时阻止登录', async () => {
    await renderPage()

    expect(container.textContent).toContain('我已阅读并同意《用户协议》和《隐私政策》')
    await clickLogin()

    expect(auth.loginWithWechat).not.toHaveBeenCalled()
    expect(taro.showToast).toHaveBeenCalledWith({ title: '请先同意用户协议', icon: 'none' })
  })

  it('登录请求处理中阻止重复提交', async () => {
    let finishLogin: ((value: { userId: string }) => void) | undefined
    auth.loginWithWechat.mockImplementation(
      () => new Promise((resolve) => {
        finishLogin = resolve
      }),
    )
    await renderPage()
    await agree()
    const button = container.querySelector<HTMLButtonElement>('button')
    if (!button) throw new Error('未找到登录按钮')

    await act(async () => {
      button.click()
      button.click()
      await Promise.resolve()
    })

    expect(auth.loginWithWechat).toHaveBeenCalledTimes(1)
    await act(async () => finishLogin?.({ userId: 'user-1' }))
  })

  it('登录失败时展示错误并恢复按钮', async () => {
    auth.loginWithWechat.mockRejectedValueOnce(new Error('微信登录暂不可用'))
    await renderPage()
    await agree()

    await clickLogin()

    expect(container.textContent).toContain('微信登录暂不可用')
    const button = container.querySelector<HTMLButtonElement>('button')
    expect(button?.disabled).toBe(false)
    expect(button?.textContent).toBe('微信登录')
  })

  it('已有 session 时等待页面就绪后再进入首页', async () => {
    session.currentUser = { userId: 'user-1' }

    await renderPage()

    expect(taro.switchTab).not.toHaveBeenCalled()
    await act(async () => taro.readyCallbacks.forEach((callback) => callback()))

    expect(taro.switchTab).toHaveBeenCalledWith({ url: '/pages/home/index' })
  })
})
