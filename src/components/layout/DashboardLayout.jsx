import { useEffect } from 'react'
import { VscLayoutSidebarRightDock } from 'react-icons/vsc'
import AppSidebar from './AppSidebar'
import TemporaryPasswordNotice from './TemporaryPasswordNotice'
import ThemeToggle from '@/shared/ThemeToggle'
import AppButton from '@/shared/AppButton'
import { cn } from '@/lib/utils'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '@/components/animate-ui/components/radix/sidebar'
import { trackSessionAccess } from '@/services/activityService'

function SidebarDockToggle() {
  const { state, isMobile, toggleSidebar } = useSidebar()

  if (isMobile) {
    return null
  }

  const isCollapsed = state === 'collapsed'

  return (
    <AppButton
      type="button"
      size="icon"
      variant="ghost"
      effect="zoomIn"
      icon={VscLayoutSidebarRightDock}
      iconClassName={cn(
        'size-5 transition-transform duration-300',
        !isCollapsed && 'rotate-180',
      )}
      className={cn(
        'fixed bottom-6 z-40 size-10 rounded-full ring-2 ring-[#1a2340]/60 dark:ring-primary/60 bg-transparent shadow-lg shadow-black/15',
        'transition-[left] duration-300 ease-out',
        isCollapsed
          ? 'left-[calc(var(--sidebar-width-icon)+0.75rem)]'
          : 'left-[calc(var(--sidebar-width)+0.75rem)]',
      )}
      tooltip={isCollapsed ? 'Expandir menu' : 'Compactar menu'}
      tooltipSide="right"
      aria-label={isCollapsed ? 'Expandir menu' : 'Compactar menu'}
      onClick={toggleSidebar}
    />
  )
}

function DashboardLayout({ user, children, onLogout }) {
  useEffect(() => {
    if (!user?.id) {
      return
    }

    trackSessionAccess(user)
  }, [user])

  return (
    <SidebarProvider>
      <AppSidebar user={user} onLogout={onLogout} />
      <SidebarInset className="min-h-svh bg-background text-foreground">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-surface/80 px-5 backdrop-blur-xl md:hidden">
          <SidebarTrigger className="cursor-pointer" />
          <span className="font-display flex-1 text-lg font-semibold text-foreground">
            Sange
          </span>
          <ThemeToggle className="size-10" />
        </header>
        <main className="px-5 py-8 lg:px-8">{children}</main>
      </SidebarInset>
      <SidebarDockToggle />
      <TemporaryPasswordNotice user={user} />
    </SidebarProvider>
  )
}

export default DashboardLayout
