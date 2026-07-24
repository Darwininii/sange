import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  countUnreadByCategory,
  getNotificationsForUser,
} from '../services/notificationService'

function withUnreadFlags(items, lastReadAt) {
  const threshold = lastReadAt ? new Date(lastReadAt).getTime() : 0

  return items.map((item) => ({
    ...item,
    unread: new Date(item.createdAt).getTime() > threshold,
  }))
}

export const useNotificationStore = create(
  persist(
    (set, get) => ({
      items: [],
      loading: false,
      error: null,
      readAtByUser: {},
      unreadTotal: 0,
      unreadByCategory: {
        orders: 0,
        inventory: 0,
        profiles: 0,
      },

      getLastReadAt: (userId) => {
        if (!userId) {
          return null
        }
        return get().readAtByUser[userId] ?? null
      },

      syncCounts: (userId) => {
        const { items, readAtByUser } = get()
        const lastReadAt = userId ? readAtByUser[userId] ?? null : null
        const counts = countUnreadByCategory(items, lastReadAt)

        set({
          items: withUnreadFlags(items, lastReadAt),
          unreadTotal: counts.total,
          unreadByCategory: {
            orders: counts.orders,
            inventory: counts.inventory,
            profiles: counts.profiles,
          },
        })
      },

      loadNotifications: async (user) => {
        if (!user?.id) {
          set({
            items: [],
            unreadTotal: 0,
            unreadByCategory: { orders: 0, inventory: 0, profiles: 0 },
            error: null,
          })
          return
        }

        set({ loading: true, error: null })

        try {
          const items = await getNotificationsForUser(user)
          const lastReadAt = get().readAtByUser[user.id] ?? null
          const counts = countUnreadByCategory(items, lastReadAt)

          set({
            items: withUnreadFlags(items, lastReadAt),
            unreadTotal: counts.total,
            unreadByCategory: {
              orders: counts.orders,
              inventory: counts.inventory,
              profiles: counts.profiles,
            },
            loading: false,
            error: null,
          })
        } catch (error) {
          set({
            loading: false,
            error:
              error instanceof Error
                ? error.message
                : 'No se pudieron cargar las notificaciones.',
          })
        }
      },

      markAllRead: (userId) => {
        if (!userId) {
          return
        }

        const nextReadAt = new Date().toISOString()

        set((state) => ({
          readAtByUser: {
            ...state.readAtByUser,
            [userId]: nextReadAt,
          },
          items: withUnreadFlags(state.items, nextReadAt),
          unreadTotal: 0,
          unreadByCategory: {
            orders: 0,
            inventory: 0,
            profiles: 0,
          },
        }))
      },
    }),
    {
      name: 'sange-notifications',
      partialize: (state) => ({
        readAtByUser: state.readAtByUser,
      }),
    },
  ),
)
