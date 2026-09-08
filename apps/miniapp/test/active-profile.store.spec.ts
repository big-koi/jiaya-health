import { beforeEach, describe, expect, it, vi } from 'vitest'

const taro = vi.hoisted(() => {
  const storage = new Map<string, unknown>()

  return {
    storage,
    getStorageSync: vi.fn((key: string) => storage.get(key)),
    setStorageSync: vi.fn((key: string, value: unknown) => storage.set(key, value)),
    removeStorageSync: vi.fn((key: string) => storage.delete(key)),
  }
})

vi.mock('@tarojs/taro', () => ({ default: taro }))

import {
  ACTIVE_PROFILE_STORAGE_KEY,
  useActiveProfileStore,
} from '../src/store/active-profile.store'

describe('useActiveProfileStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    taro.storage.clear()
    useActiveProfileStore.getState().clearSelection()
  })

  it('切换档案时只保存家庭与档案标识，不复制档案业务对象', () => {
    useActiveProfileStore.getState().selectProfile('family-1', 'profile-2')

    const { activeFamilyId, activeProfileId } = useActiveProfileStore.getState()
    expect({ activeFamilyId, activeProfileId }).toEqual({
      activeFamilyId: 'family-1',
      activeProfileId: 'profile-2',
    })
    expect(taro.storage.get(ACTIVE_PROFILE_STORAGE_KEY)).toEqual({
      activeFamilyId: 'family-1',
      activeProfileId: 'profile-2',
    })
  })

  it('切换家庭时清除不再属于当前家庭的档案选择', () => {
    useActiveProfileStore.getState().selectProfile('family-1', 'profile-1')

    useActiveProfileStore.getState().selectFamily('family-2')

    expect(useActiveProfileStore.getState()).toMatchObject({
      activeFamilyId: 'family-2',
      activeProfileId: null,
    })
  })
})
