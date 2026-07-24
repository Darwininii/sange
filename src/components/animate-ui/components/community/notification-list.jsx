'use client'

import * as React from 'react'
import { ArrowUpRight } from 'lucide-react'
import { motion } from 'motion/react'
import { cn } from '@/lib/utils'

const VISIBLE_AT_ONCE = 5
const NOTIFICATION_TTL_MS = 24 * 60 * 60 * 1000
/** Approx. height of 5 expanded cards (padding + title + wrapped subtitle). */
const LIST_MAX_HEIGHT_CLASS = 'max-h-[22.5rem]'

const transition = {
  type: 'spring',
  stiffness: 300,
  damping: 26,
}

const getCardVariants = (i) => ({
  collapsed: {
    marginTop: i === 0 ? 0 : -44,
    scaleX: Math.max(0.85, 1 - Math.min(i, VISIBLE_AT_ONCE - 1) * 0.05),
  },
  expanded: {
    marginTop: i === 0 ? 0 : 4,
    scaleX: 1,
  },
})

const textSwitchTransition = {
  duration: 0.22,
  ease: 'easeInOut',
}

const notificationTextVariants = {
  collapsed: { opacity: 1, y: 0, pointerEvents: 'auto' },
  expanded: { opacity: 0, y: -16, pointerEvents: 'none' },
}

const viewAllTextVariants = {
  collapsed: { opacity: 0, y: 16, pointerEvents: 'none' },
  expanded: { opacity: 1, y: 0, pointerEvents: 'auto' },
}

function isWithinLast24Hours(item) {
  if (!item?.createdAt) {
    return false
  }

  const createdAt = new Date(item.createdAt).getTime()
  if (Number.isNaN(createdAt)) {
    return false
  }

  return Date.now() - createdAt <= NOTIFICATION_TTL_MS
}

function NotificationList({
  items = [],
  title = 'Notificaciones',
  viewAllLabel = 'Ver todas',
  emptyMessage = 'No hay notificaciones nuevas',
  onViewAll,
  onItemClick,
  className,
}) {
  const recentItems = React.useMemo(
    () => items.filter(isWithinLast24Hours),
    [items],
  )
  const unreadCount = recentItems.filter((item) => item.unread).length
  const canScroll = recentItems.length > VISIBLE_AT_ONCE

  return (
    <motion.div
      className={cn(
        'w-80 space-y-3 overflow-hidden rounded-3xl bg-surface p-3 shadow-md ring-1 ring-border',
        className,
      )}
      initial="collapsed"
      whileHover="expanded"
    >
      <div
        className={cn(
          LIST_MAX_HEIGHT_CLASS,
          canScroll && 'overflow-y-auto overscroll-contain pr-1',
          !canScroll && 'overflow-hidden',
        )}
        onWheel={(event) => event.stopPropagation()}
      >
        {recentItems.length === 0 ? (
          <div className="rounded-xl bg-background px-4 py-6 text-center text-xs font-medium text-foreground/55">
            {emptyMessage}
          </div>
        ) : (
          recentItems.map((notification, i) => (
            <motion.button
              key={notification.id}
              type="button"
              className={cn(
                'relative block w-full whitespace-normal rounded-2xl bg-linear-to-br from-background to-surface px-4 py-2 text-left shadow-sm transition-shadow duration-200 hover:shadow-lg',
                notification.unread && 'ring-1 ring-primary/25',
              )}
              variants={getCardVariants(i)}
              transition={transition}
              style={{
                zIndex: recentItems.length - i,
              }}
              onClick={() => onItemClick?.(notification)}
            >
              <div className="flex items-start justify-between gap-2">
                <h1 className="min-w-0 flex-1 text-sm font-medium wrap-break-words text-foreground">
                  <span className="text-foreground/55">{notification.time}</span>
                  <span className="text-foreground/55"> · </span>
                  {notification.title}
                </h1>
                {notification.unread ? (
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                ) : null}
              </div>
              <p className="text-xs font-medium wrap-break-words whitespace-normal text-foreground/55">
                {notification.subtitle}
              </p>
            </motion.button>
          ))
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="flex size-5 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
          {unreadCount || recentItems.length}
        </div>
        <span className="grid">
          <motion.span
            className="col-start-1 row-start-1 text-sm font-medium text-foreground/70"
            variants={notificationTextVariants}
            transition={textSwitchTransition}
          >
            {title}
          </motion.span>
          <motion.button
            type="button"
            className="col-start-1 row-start-1 flex cursor-pointer items-center gap-1 text-sm font-medium text-foreground/70 select-none"
            variants={viewAllTextVariants}
            transition={textSwitchTransition}
            onClick={() => onViewAll?.()}
          >
            {viewAllLabel} <ArrowUpRight className="size-4" />
          </motion.button>
        </span>
      </div>
    </motion.div>
  )
}

export { NotificationList }
