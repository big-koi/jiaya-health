import Taro from '@tarojs/taro'
import { create } from 'zustand'

import { useActiveProfileStore } from './active-profile.store'

export const SESSION_STORAGE_KEY = 'jiaya.session'

export type CurrentUser = {
  userId: string
}

type PersistedSession = {
  accessToken: string | null
  currentUser: CurrentUser | null
}

type SessionStore = PersistedSession & {
  setAccessToken: (accessToken: string) => void
  setSession: (accessToken: string, currentUser: CurrentUser) => void
  clearSession: () => void
}

const EMPTY_SESSION: PersistedSession = {
  accessToken: null,
  currentUser: null,
}

function readSession(): PersistedSession {
  try {
    const value = Taro.getStorageSync(SESSION_STORAGE_KEY) as unknown
    if (!value || typeof value !== 'object') return EMPTY_SESSION

    const stored = value as Partial<PersistedSession>
    return {
      accessToken: typeof stored.accessToken === 'string' ? stored.accessToken : null,
      currentUser:
        stored.currentUser && typeof stored.currentUser.userId === 'string'
          ? { userId: stored.currentUser.userId }
          : null,
    }
  } catch {
    return EMPTY_SESSION
  }
}

function persistSession(session: PersistedSession): void {
  Taro.setStorageSync(SESSION_STORAGE_KEY, session)
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  ...readSession(),
  setAccessToken: (accessToken) => {
    useActiveProfileStore.getState().clearSelection()
    const session = { ...get(), accessToken, currentUser: null }
    const persisted = { accessToken: session.accessToken, currentUser: session.currentUser }
    persistSession(persisted)
    set(persisted)
  },
  setSession: (accessToken, currentUser) => {
    const session = { accessToken, currentUser: { userId: currentUser.userId } }
    persistSession(session)
    set(session)
  },
  clearSession: () => {
    Taro.removeStorageSync(SESSION_STORAGE_KEY)
    useActiveProfileStore.getState().clearSelection()
    set(EMPTY_SESSION)
  },
}))
