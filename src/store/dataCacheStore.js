import { create } from 'zustand'

function buildScopedKey(userId, cacheKey) {
  if (!userId || !cacheKey) {
    return null
  }

  return `${cacheKey}:${userId}`
}

export const useDataCacheStore = create((set, get) => ({
  entries: {},

  getEntry(userId, cacheKey) {
    const scopedKey = buildScopedKey(userId, cacheKey)

    if (!scopedKey) {
      return null
    }

    const entry = get().entries[scopedKey]

    if (!entry || entry.userId !== userId) {
      return null
    }

    return entry.data
  },

  setEntry(userId, cacheKey, data) {
    const scopedKey = buildScopedKey(userId, cacheKey)

    if (!scopedKey) {
      return
    }

    set((state) => ({
      entries: {
        ...state.entries,
        [scopedKey]: {
          data,
          userId,
          updatedAt: Date.now(),
        },
      },
    }))
  },

  removeEntry(userId, cacheKey) {
    const scopedKey = buildScopedKey(userId, cacheKey)

    if (!scopedKey) {
      return
    }

    set((state) => {
      if (!state.entries[scopedKey]) {
        return state
      }

      const entries = { ...state.entries }
      delete entries[scopedKey]
      return { entries }
    })
  },

  invalidateByPrefix(userId, prefix) {
    if (!userId || !prefix) {
      return
    }

    const scopedPrefix = `${prefix}:${userId}`

    set((state) => {
      const entries = { ...state.entries }
      let changed = false

      for (const key of Object.keys(entries)) {
        if (key.startsWith(scopedPrefix) && entries[key]?.userId === userId) {
          delete entries[key]
          changed = true
        }
      }

      return changed ? { entries } : state
    })
  },

  clearForUser(userId) {
    if (!userId) {
      return
    }

    set((state) => {
      const entries = { ...state.entries }
      let changed = false

      for (const [key, entry] of Object.entries(entries)) {
        if (entry.userId === userId) {
          delete entries[key]
          changed = true
        }
      }

      return changed ? { entries } : state
    })
  },

  clearAll() {
    set({ entries: {} })
  },
}))

export function clearDataCache() {
  useDataCacheStore.getState().clearAll()
}

export function invalidateUserCache(userId, cacheKey) {
  useDataCacheStore.getState().removeEntry(userId, cacheKey)
}

export function invalidateUserCacheByPrefix(userId, prefix) {
  useDataCacheStore.getState().invalidateByPrefix(userId, prefix)
}
