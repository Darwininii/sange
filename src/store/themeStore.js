import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const THEME_STORAGE_KEY = 'sange-theme'

function applyDocumentTheme(theme) {
  const root = document.documentElement
  const isDark = theme === 'dark'

  root.classList.toggle('dark', isDark)
  root.style.colorScheme = isDark ? 'dark' : 'light'

  const meta = document.querySelector('meta[name="color-scheme"]')
  if (meta) {
    meta.setAttribute('content', isDark ? 'dark' : 'light')
  }
}

export const useThemeStore = create(
  persist(
    (set, get) => ({
      theme: 'dark',
      setTheme: (theme) => {
        applyDocumentTheme(theme)
        set({ theme })
      },
      toggleTheme: () => {
        const nextTheme = get().theme === 'dark' ? 'light' : 'dark'
        applyDocumentTheme(nextTheme)
        set({ theme: nextTheme })
      },
    }),
    {
      name: THEME_STORAGE_KEY,
      onRehydrateStorage: () => (state) => {
        if (state?.theme) {
          applyDocumentTheme(state.theme)
        }
      },
    },
  ),
)

export function initThemeFromStorage() {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    const theme = parsed?.state?.theme === 'light' ? 'light' : 'dark'
    applyDocumentTheme(theme)
    return theme
  } catch {
    applyDocumentTheme('dark')
    return 'dark'
  }
}
