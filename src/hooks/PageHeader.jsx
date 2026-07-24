import { useEffect, useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { HiOutlineBell } from 'react-icons/hi2'
import {
  Popover,
  PopoverButton,
  PopoverPanel,
} from '@/components/animate-ui/components/headless/popover'
import { NotificationList } from '@/components/animate-ui/components/community/notification-list'
import CustomBadge from '@/shared/CustomBadge'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { useNotificationStore } from '@/store/notificationStore'

function DockBellButton({ badgeCount = 0 }) {
  return (
    <div className="relative flex shrink-0 items-center justify-center">
      <PopoverButton
        aria-label="Notificaciones"
        title="Notificaciones"
        className={cn(
          'relative flex size-10 cursor-pointer items-center justify-center rounded-full p-0 text-foreground shadow-lg shadow-black/30 outline-none',
          'hover:bg-primary/60 hover:text-black hover:ring-black/80',
          'dark:ring-border dark:hover:bg-primary/15 dark:hover:text-accent dark:hover:ring-primary/40',
          'data-open:bg-primary/70 data-open:text-black data-open:ring-black/80',
          'dark:data-open:bg-primary/15 dark:data-open:text-accent dark:data-open:ring-primary/40',
        )}
      >
        <HiOutlineBell className="size-6" />
        <CustomBadge
          count={badgeCount}
          className="absolute -top-0.5 -right-0.5 size-5 min-w-5"
        />
      </PopoverButton>
    </div>
  )
}

function NotificationsOpenEffect({ open, userId }) {
  const markAllRead = useNotificationStore((store) => store.markAllRead)
  const wasOpenRef = useRef(false)

  useEffect(() => {
    if (wasOpenRef.current && !open && userId) {
      markAllRead(userId)
    }
    wasOpenRef.current = open
  }, [open, userId, markAllRead])

  return null
}

function PageHeader({ title, className = '' }) {
  const navigate = useNavigate()
  const user = useAuthStore((store) => store.user)
  const items = useNotificationStore((store) => store.items)
  const unreadTotal = useNotificationStore((store) => store.unreadTotal)

  const handleItemClick = (notification) => {
    if (notification?.href) {
      navigate({ to: notification.href })
    }
  }

  const handleViewAll = () => {
    if (user?.role === 'admin') {
      navigate({ to: '/dashboard/historial' })
      return
    }
    navigate({ to: '/dashboard/orders' })
  }

  return (
    <section className={cn('flex justify-start py-3', className)}>
      <div className="flex items-center gap-4 rounded-full bg-linear-to-br from-background to-surface py-1 pr-3 pl-6 shadow-xl shadow-black/30 ring-1 ring-border">
        <h2 className="font-display text-base font-semibold tracking-tight whitespace-nowrap text-foreground md:text-lg">
          {title}
        </h2>

        <Popover>
          {({ open }) => (
            <>
              <NotificationsOpenEffect open={open} userId={user?.id} />
              <DockBellButton badgeCount={unreadTotal} />
              <PopoverPanel
                anchor={{ to: 'bottom end', gap: 12 }}
                className="z-50 max-h-none w-auto overflow-visible border-0 bg-transparent p-0 shadow-none"
              >
                <NotificationList
                  items={items}
                  title="Notificaciones"
                  viewAllLabel={
                    user?.role === 'admin' ? 'Ver historial' : 'Ver ordenes'
                  }
                  onItemClick={handleItemClick}
                  onViewAll={handleViewAll}
                />
              </PopoverPanel>
            </>
          )}
        </Popover>
      </div>
    </section>
  )
}

export default PageHeader
