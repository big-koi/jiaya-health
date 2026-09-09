// @vitest-environment jsdom

import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@tarojs/components', async () => {
  const React = await import('react')
  type Props = { children?: ReactNode; className?: string; onClick?: () => void; disabled?: boolean }
  const basic = (tag: 'div' | 'span') => ({ children, ...props }: Props) => React.createElement(tag, props, children)
  return {
    View: basic('div'),
    Text: basic('span'),
    Button: ({ children, ...props }: Props & { loading?: boolean }) => {
      const { loading, ...domProps } = props
      void loading
      return React.createElement('button', domProps, children)
    },
  }
})

import { PrimaryButton } from '../src/components/PrimaryButton'
import { SegmentedControl } from '../src/components/SegmentedControl'
import { StateView } from '../src/components/StateView'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

describe('第一轮共享视觉组件', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  it('加载中的主按钮禁用并显示处理状态', async () => {
    await act(async () => root.render(createElement(PrimaryButton, { loading: true }, '保存记录')))
    const button = container.querySelector('button')
    expect(button?.disabled).toBe(true)
    expect(button?.textContent).toContain('处理中')
  })

  it('错误状态向用户提供重试操作', async () => {
    const onRetry = vi.fn()
    await act(async () => root.render(createElement(StateView, {
      state: 'error', title: '加载失败', description: '网络开小差了', onRetry,
    })))
    const button = container.querySelector('button')
    expect(container.textContent).toContain('加载失败')
    await act(async () => button?.click())
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('分段控件只回传用户选择的值', async () => {
    const onChange = vi.fn()
    await act(async () => root.render(createElement(SegmentedControl, {
      value: '7d',
      options: [{ label: '近7天', value: '7d' }, { label: '近30天', value: '30d' }],
      onChange,
      ariaLabel: '时间范围',
    })))
    const buttons = container.querySelectorAll('button')
    await act(async () => (buttons[1] as HTMLButtonElement).click())
    expect(onChange).toHaveBeenCalledWith('30d')
    expect(onChange).toHaveBeenCalledTimes(1)
  })
})
