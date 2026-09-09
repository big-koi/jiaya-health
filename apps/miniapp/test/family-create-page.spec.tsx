// @vitest-environment jsdom

import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const families = vi.hoisted(() => ({ create: vi.fn() }))
const taro = vi.hoisted(() => {
  const storage = new Map<string, unknown>()
  return {
    storage,
    getStorageSync: vi.fn((key: string) => storage.get(key)),
    setStorageSync: vi.fn((key: string, value: unknown) => storage.set(key, value)),
    removeStorageSync: vi.fn((key: string) => storage.delete(key)),
    showToast: vi.fn(async () => ({ errMsg: 'showToast:ok' })),
    navigateBack: vi.fn(async () => ({ errMsg: 'navigateBack:ok' })),
  }
})

vi.mock('../src/services/api/families.api', () => ({ familiesApi: families }))
vi.mock('@tarojs/taro', () => ({ default: taro }))
vi.mock('@tarojs/components', async () => {
  const React = await import('react')
  type BasicProps = { children?: ReactNode; className?: string }
  type InputProps = BasicProps & {
    value?: string
    placeholder?: string
    maxlength?: number
    onInput?: (event: { detail: { value: string } }) => void
  }
  type ButtonProps = BasicProps & {
    disabled?: boolean
    loading?: boolean
    onClick?: () => void
  }
  return {
    View: ({ children, ...props }: BasicProps) => React.createElement('div', props, children),
    Text: ({ children, ...props }: BasicProps) => React.createElement('span', props, children),
    Input: ({ onInput, maxlength, ...props }: InputProps) => React.createElement('input', {
      ...props,
      maxLength: maxlength,
      onInput: (event: { currentTarget: { value: string } }) =>
        onInput?.({ detail: { value: event.currentTarget.value } }),
    }),
    Button: ({ children, loading, ...props }: ButtonProps) => React.createElement(
      'button',
      { ...props, 'data-loading': String(Boolean(loading)) },
      children,
    ),
  }
})

import FamilyCreatePage from '../src/pages/family-create/index'
import { ACTIVE_PROFILE_STORAGE_KEY, useActiveProfileStore } from '../src/store/active-profile.store'

const actEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
actEnvironment.IS_REACT_ACT_ENVIRONMENT = true

describe('FamilyCreatePage', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    vi.clearAllMocks()
    taro.storage.clear()
    useActiveProfileStore.getState().clearSelection()
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  async function renderPage(): Promise<void> {
    await act(async () => root.render(createElement(FamilyCreatePage)))
  }

  it('家庭名称为空时不发请求并展示校验错误', async () => {
    await renderPage()
    const button = container.querySelector<HTMLButtonElement>('button')
    if (!button) throw new Error('未找到创建按钮')

    await act(async () => button.click())

    expect(families.create).not.toHaveBeenCalled()
    expect(container.textContent).toContain('请填写家庭名称')
  })

  it('请求处理中阻止重复创建，成功后选中新家庭', async () => {
    let finish: ((value: {
      id: string
      name: string
      avatar: null
      ownerUserId: string
      memberCount: number
      createdAt: string
      updatedAt: string
    }) => void) | undefined
    families.create.mockImplementation(() => new Promise((resolve) => { finish = resolve }))
    await renderPage()
    const input = container.querySelector<HTMLInputElement>('input')
    const button = container.querySelector<HTMLButtonElement>('button')
    if (!input || !button) throw new Error('未找到家庭表单')
    await act(async () => {
      input.value = ' 温暖小家 '
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })

    await act(async () => {
      button.click()
      button.click()
      await Promise.resolve()
    })

    expect(families.create).toHaveBeenCalledTimes(1)
    expect(families.create).toHaveBeenCalledWith({ name: '温暖小家' })
    await act(async () => finish?.({
      id: 'family-new',
      name: '温暖小家',
      avatar: null,
      ownerUserId: 'user-1',
      memberCount: 1,
      createdAt: '2026-09-09T00:00:00.000Z',
      updatedAt: '2026-09-09T00:00:00.000Z',
    }))
    expect(taro.storage.get(ACTIVE_PROFILE_STORAGE_KEY)).toEqual({
      activeFamilyId: 'family-new',
      activeProfileId: null,
    })
    expect(taro.navigateBack).toHaveBeenCalledTimes(1)
  })
})
