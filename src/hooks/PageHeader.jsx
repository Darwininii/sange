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

function DockBellButton({ badgeCount = 0, compact = false }) {
  return (
    <div className="relative flex shrink-0 items-center justify-center">
      <PopoverButton
        aria-label="Notificaciones"
        title="Notificaciones"
        className={cn(
          'relative flex cursor-pointer items-center justify-center rounded-full p-0 text-foreground shadow-lg shadow-black/30 outline-none',
          compact ? 'size-9' : 'size-10',
          'hover:bg-primary/60 hover:text-black hover:ring-black/80',
          'dark:ring-border dark:hover:bg-primary/15 dark:hover:text-accent dark:hover:ring-primary/40',
          'data-open:bg-primary/70 data-open:text-black data-open:ring-black/80',
          'dark:data-open:bg-primary/15 dark:data-open:text-accent dark:data-open:ring-primary/40',
        )}
      >
        <HiOutlineBell className={compact ? 'size-5' : 'size-6'} />
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

function PageHeader({ title, className = '', variant = 'page' }) {
  const navigate = useNavigate()
  const user = useAuthStore((store) => store.user)
  const items = useNotificationStore((store) => store.items)
  const unreadTotal = useNotificationStore((store) => store.unreadTotal)
  const isBar = variant === 'bar'

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
    <section
      className={cn(
        isBar
          ? 'flex min-w-0 flex-1 items-center'
          : 'hidden justify-start py-3 md:flex',
        className,
      )}
    >
      <div
        className={cn(
          'flex min-w-0 items-center rounded-full bg-linear-to-br from-background to-surface shadow-xl shadow-black/30 ring-1 ring-border',
          isBar ? 'max-w-full gap-2 py-0.5 pr-1.5 pl-3' : 'gap-4 py-1 pr-3 pl-6',
        )}
      >
        <h2
          className={cn(
            'font-display font-semibold tracking-tight text-foreground',
            isBar
              ? 'truncate text-sm'
              : 'whitespace-nowrap text-base md:text-lg',
          )}
        >
          {title}
        </h2>

        <Popover>
          {({ open }) => (
            <>
              <NotificationsOpenEffect open={open} userId={user?.id} />
              <DockBellButton badgeCount={unreadTotal} compact={isBar} />
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
