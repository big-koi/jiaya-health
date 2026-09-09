// @vitest-environment jsdom

import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  profiles: { get: vi.fn(), create: vi.fn(), update: vi.fn() },
  permissions: { list: vi.fn() },
}))

const taro = vi.hoisted(() => {
  const storage = new Map<string, unknown>()
  return {
    storage,
    routerParams: {} as Record<string, string>,
    didShowCallbacks: [] as Array<() => void>,
    getStorageSync: vi.fn((key: string) => storage.get(key)),
    setStorageSync: vi.fn((key: string, value: unknown) => storage.set(key, value)),
    removeStorageSync: vi.fn((key: string) => storage.delete(key)),
    showToast: vi.fn(async () => ({ errMsg: 'showToast:ok' })),
    navigateBack: vi.fn(async () => ({ errMsg: 'navigateBack:ok' })),
    switchTab: vi.fn(async () => ({ errMsg: 'switchTab:ok' })),
  }
})

vi.mock('../src/services/api/profiles.api', () => ({ profilesApi: api.profiles }))
vi.mock('../src/services/api/permissions.api', () => ({ permissionsApi: api.permissions }))
vi.mock('@tarojs/taro', () => ({
  default: taro,
  useRouter: () => ({ params: taro.routerParams }),
  useDidShow: (callback: () => void) => taro.didShowCallbacks.push(callback),
}))
vi.mock('@tarojs/components', async () => {
  const React = await import('react')
  type BasicProps = { children?: ReactNode; className?: string; onClick?: () => void }
  type InputProps = BasicProps & {
    value?: string
    maxlength?: number
    onInput?: (event: { detail: { value: string } }) => void
  }
  type PickerProps = BasicProps & {
    mode?: string
    onChange?: (event: { detail: { value: string } }) => void
  }
  type SwitchProps = BasicProps & {
    checked?: boolean
    onChange?: (event: { detail: { value: boolean } }) => void
  }
  type ButtonProps = BasicProps & { disabled?: boolean; loading?: boolean }
  const basic = (tag: 'div' | 'span') =>
    ({ children, ...props }: BasicProps) => React.createElement(tag, props, children)
  return {
    View: basic('div'),
    Text: basic('span'),
    Button: ({ children, loading, ...props }: ButtonProps) =>
      React.createElement('button', { ...props, 'data-loading': String(Boolean(loading)) }, children),
    Input: ({ onInput, maxlength, ...props }: InputProps) => React.createElement('input', {
      ...props,
      maxLength: maxlength,
      onInput: (event: { currentTarget: { value: string } }) =>
        onInput?.({ detail: { value: event.currentTarget.value } }),
    }),
    Picker: ({ children, mode, onChange }: PickerProps) => React.createElement(
      'div',
      {
        'data-picker-mode': mode,
        onClick: () => onChange?.({ detail: { value: mode === 'date' ? '1958-03-12' : '2' } }),
      },
      children,
    ),
    Switch: ({ checked, onChange }: SwitchProps) => React.createElement('input', {
      type: 'checkbox',
      checked,
      onChange: (event: { currentTarget: { checked: boolean } }) =>
        onChange?.({ detail: { value: event.currentTarget.checked } }),
    }),
  }
})

import FamilyProfilePage from '../src/pages/family-profile/index'
import FamilyProfileAddPage from '../src/pages/family-profile-add/index'
import { ACTIVE_PROFILE_STORAGE_KEY, useActiveProfileStore } from '../src/store/active-profile.store'
import { useSessionStore } from '../src/store/session.store'

const actEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
actEnvironment.IS_REACT_ACT_ENVIRONMENT = true

const profile = {
  id: 'profile-1',
  familyId: 'family-1',
  name: '王阿姨',
  relationship: 'mother',
  birthday: '1960-01-01T00:00:00.000Z',
  avatar: null,
  elderMode: false,
  linkedUserId: null,
  createdAt: '2026-09-09T00:00:00.000Z',
  updatedAt: '2026-09-09T00:00:00.000Z',
}

describe('family profile pages', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    vi.clearAllMocks()
    taro.storage.clear()
    taro.routerParams = {}
    taro.didShowCallbacks.length = 0
    useActiveProfileStore.getState().clearSelection()
    useSessionStore.getState().setSession('token-1', {
      userId: 'user-1',
      nickname: '小明',
      avatar: null,
    })
    api.profiles.get.mockResolvedValue(profile)
    api.profiles.create.mockResolvedValue(profile)
    api.profiles.update.mockResolvedValue(profile)
    api.permissions.list.mockResolvedValue([])
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  async function renderPage(page: () => JSX.Element): Promise<void> {
    await act(async () => root.render(createElement(page)))
    await act(async () => {
      taro.didShowCallbacks.forEach((callback) => callback())
      await Promise.resolve()
      await Promise.resolve()
    })
  }

  it('成员新增页通过直接交互提交完整资料并选中新成员', async () => {
    taro.routerParams = { familyId: 'family-1' }
    await renderPage(FamilyProfileAddPage)

    const nameInput = container.querySelector<HTMLInputElement>('input:not([type="checkbox"])')
    const relationshipPicker = container.querySelector<HTMLElement>('[data-picker-mode="selector"]')
    const birthdayPicker = container.querySelector<HTMLElement>('[data-picker-mode="date"]')
    const elderSwitch = container.querySelector<HTMLInputElement>('input[type="checkbox"]')
    const save = container.querySelector<HTMLButtonElement>('button')
    if (!nameInput || !relationshipPicker || !birthdayPicker || !elderSwitch || !save) {
      throw new Error('成员新增表单未完整渲染')
    }

    await act(async () => {
      nameInput.value = ' 王叔叔 '
      nameInput.dispatchEvent(new Event('input', { bubbles: true }))
      relationshipPicker.click()
      birthdayPicker.click()
      elderSwitch.click()
    })
    await act(async () => { save.click(); await Promise.resolve() })

    expect(api.profiles.create).toHaveBeenCalledWith({
      familyId: 'family-1',
      name: '王叔叔',
      relationship: 'father',
      birthday: '1958-03-12',
      elderMode: true,
    })
    expect(taro.storage.get(ACTIVE_PROFILE_STORAGE_KEY)).toEqual({
      activeFamilyId: 'family-1',
      activeProfileId: 'profile-1',
    })
    expect(taro.navigateBack).toHaveBeenCalledTimes(1)
  })

  it('成员详情页对无管理权限用户隐藏编辑入口并允许切换查看成员', async () => {
    taro.routerParams = { profileId: 'profile-1', edit: '1' }
    api.permissions.list.mockResolvedValue([{
      profileId: 'profile-1',
      userId: 'user-1',
      canView: true,
      canRecord: true,
      canManageReminder: false,
      canManageProfile: false,
      canReceiveAttention: false,
    }])
    await renderPage(FamilyProfilePage)

    expect(container.querySelector('.profile-detail-page__edit')).toBeNull()
    expect(container.querySelector('.profile-detail-page__input')).toBeNull()
    const switchButton = container.querySelector<HTMLButtonElement>('button')
    if (!switchButton) throw new Error('未找到切换成员按钮')
    await act(async () => switchButton.click())

    expect(api.profiles.update).not.toHaveBeenCalled()
    expect(taro.storage.get(ACTIVE_PROFILE_STORAGE_KEY)).toEqual({
      activeFamilyId: 'family-1',
      activeProfileId: 'profile-1',
    })
    expect(taro.switchTab).toHaveBeenCalledWith({ url: '/pages/home/index' })
  })

  it('成员详情页仅在有管理权限时允许直接编辑并保存', async () => {
    taro.routerParams = { profileId: 'profile-1' }
    api.permissions.list.mockResolvedValue([{
      profileId: 'profile-1',
      userId: 'user-1',
      canView: true,
      canRecord: true,
      canManageReminder: true,
      canManageProfile: true,
      canReceiveAttention: true,
    }])
    api.profiles.update.mockResolvedValue({ ...profile, name: '新姓名', elderMode: true })
    await renderPage(FamilyProfilePage)

    const edit = container.querySelector<HTMLElement>('.profile-detail-page__edit')
    if (!edit) throw new Error('有权限时未显示编辑入口')
    await act(async () => edit.click())
    const nameInput = container.querySelector<HTMLInputElement>('.profile-detail-page__input')
    const elderSwitch = container.querySelector<HTMLInputElement>('input[type="checkbox"]')
    const save = container.querySelector<HTMLButtonElement>('button')
    if (!nameInput || !elderSwitch || !save) throw new Error('成员编辑表单未完整渲染')

    await act(async () => {
      nameInput.value = ' 新姓名 '
      nameInput.dispatchEvent(new Event('input', { bubbles: true }))
      elderSwitch.click()
    })
    await act(async () => { save.click(); await Promise.resolve() })

    expect(api.profiles.update).toHaveBeenCalledWith('profile-1', {
      name: '新姓名',
      elderMode: true,
    })
    expect(taro.showToast).toHaveBeenCalledWith({ title: '成员资料已更新', icon: 'success' })
  })
})
