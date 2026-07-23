import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { clearSessionActivityFlag } from '../services/activityService'
import { clearDataCache } from './dataCacheStore'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      login: (user) => set({ user }),
      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : state.user,
        })),
      logout: () => {
        const userId = get().user?.id
        clearDataCache()
        clearSessionActivityFlag(userId)
        if (userId && typeof window !== 'undefined') {
          try {
            window.sessionStorage.removeItem(`sange:temp-password-notice:${userId}`)
          } catch {
            // Ignore storage errors.
          }
        }
        set({ user: null })
      },
    }),
    {
      name: 'sange-auth',
    },
  ),
)
