import { useEffect } from 'react'
import { VscLayoutSidebarRightDock } from 'react-icons/vsc'
import AppSidebar from './AppSidebar'
import TemporaryPasswordNotice from './TemporaryPasswordNotice'
import PageHeader from '@/hooks/PageHeader'
import { useDashboardPageTitle } from '@/hooks/useDashboardPageTitle'
import ThemeToggle from '@/shared/ThemeToggle'
import AppButton from '@/shared/AppButton'
import { cn } from '@/lib/utils'
import {
  SidebarInset,
  SidebarProvider,
  useSidebar,
} from '@/components/animate-ui/components/radix/sidebar'
import { trackSessionAccess } from '@/services/activityService'
import { useNotificationStore } from '@/store/notificationStore'

const SIDEBAR_TOGGLE_ICON = VscLayoutSidebarRightDock

function SidebarToggleButton({
  className,
  iconClassName,
  tooltip,
  tooltipSide = 'right',
  ariaLabel,
  rotateWhenExpanded = false,
}) {
  const { state, toggleSidebar } = useSidebar()
  const isCollapsed = state === 'collapsed'
  const label = ariaLabel ?? (isCollapsed ? 'Expandir menu' : 'Compactar menu')

  return (
    <AppButton
      type="button"
      size="icon"
      variant="ghost"
      effect="zoomIn"
      icon={SIDEBAR_TOGGLE_ICON}
      iconClassName={cn(
        'size-5 transition-transform duration-300',
        rotateWhenExpanded && !isCollapsed && 'rotate-180',
        iconClassName,
      )}
      className={className}
      tooltip={tooltip}
      tooltipSide={tooltipSide}
      aria-label={label}
      onClick={toggleSidebar}
    />
  )
}

function SidebarDockToggle() {
  const { state, isMobile } = useSidebar()

  if (isMobile) {
    return null
  }

  const isCollapsed = state === 'collapsed'

  return (
    <SidebarToggleButton
      rotateWhenExpanded
      className={cn(
        'fixed bottom-6 z-40 size-10 rounded-full bg-transparent shadow-lg shadow-black/15',
        'transition-[left] duration-300 ease-out',
        isCollapsed
          ? 'left-[calc(var(--sidebar-width-icon)+0.75rem)]'
          : 'left-[calc(var(--sidebar-width)+0.75rem)]',
      )}
      tooltip={isCollapsed ? 'Expandir menu' : 'Compactar menu'}
    />
  )
}

function DashboardLayout({ user, children, onLogout }) {
  const pageTitle = useDashboardPageTitle()
  const loadNotifications = useNotificationStore((store) => store.loadNotifications)

  useEffect(() => {
    if (!user?.id) {
      return
    }

    trackSessionAccess(user)
  }, [user])

  useEffect(() => {
    if (!user?.id) {
      return
    }

    loadNotifications(user)

    const intervalId = window.setInterval(() => {
      loadNotifications(user)
    }, 60_000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [user, loadNotifications])

  if (!user) {
    return null
  }

  return (
    <SidebarProvider>
      <AppSidebar user={user} onLogout={onLogout} />
      <SidebarInset className="min-h-svh bg-background text-foreground">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-border bg-surface/80 px-3 backdrop-blur-xl md:hidden">
          <SidebarToggleButton
            className="size-10 shrink-0"
            ariaLabel="Abrir menu"
            tooltip="Abrir menu"
            tooltipSide="bottom"
          />
          <PageHeader title={pageTitle} variant="bar" />
          <ThemeToggle className="size-10 shrink-0" />
        </header>
        <main className="px-5 pt-4 pb-8 md:py-8 lg:px-8">{children}</main>
      </SidebarInset>
      <SidebarDockToggle />
      <TemporaryPasswordNotice user={user} />
    </SidebarProvider>
  )
}

export default DashboardLayout
