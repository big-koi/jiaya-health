import Taro from '@tarojs/taro'
import { create } from 'zustand'

export const ACTIVE_PROFILE_STORAGE_KEY = 'jiaya.active-profile'

type ActiveProfileSelection = {
  activeFamilyId: string | null
  activeProfileId: string | null
}

type ActiveProfileStore = ActiveProfileSelection & {
  selectFamily: (familyId: string | null) => void
  selectProfile: (familyId: string, profileId: string) => void
  clearSelection: () => void
}

const EMPTY_SELECTION: ActiveProfileSelection = {
  activeFamilyId: null,
  activeProfileId: null,
}

function readSelection(): ActiveProfileSelection {
  try {
    const value = Taro.getStorageSync(ACTIVE_PROFILE_STORAGE_KEY) as unknown
    if (!value || typeof value !== 'object') return EMPTY_SELECTION

    const stored = value as Partial<ActiveProfileSelection>
    return {
      activeFamilyId: typeof stored.activeFamilyId === 'string' ? stored.activeFamilyId : null,
      activeProfileId: typeof stored.activeProfileId === 'string' ? stored.activeProfileId : null,
    }
  } catch {
    return EMPTY_SELECTION
  }
}

function persistSelection(selection: ActiveProfileSelection): void {
  Taro.setStorageSync(ACTIVE_PROFILE_STORAGE_KEY, selection)
}

export const useActiveProfileStore = create<ActiveProfileStore>((set) => ({
  ...readSelection(),
  selectFamily: (activeFamilyId) => {
    const selection = { activeFamilyId, activeProfileId: null }
    persistSelection(selection)
    set(selection)
  },
  selectProfile: (activeFamilyId, activeProfileId) => {
    const selection = { activeFamilyId, activeProfileId }
    persistSelection(selection)
    set(selection)
  },
  clearSelection: () => {
    Taro.removeStorageSync(ACTIVE_PROFILE_STORAGE_KEY)
    set(EMPTY_SELECTION)
  },
}))
