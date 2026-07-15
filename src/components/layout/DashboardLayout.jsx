import AppSidebar from './AppSidebar'
import TemporaryPasswordNotice from './TemporaryPasswordNotice'
import ThemeToggle from '@/shared/ThemeToggle'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/animate-ui/components/radix/sidebar'

function DashboardLayout({ user, children, onLogout }) {
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
      <TemporaryPasswordNotice user={user} />
    </SidebarProvider>
  )
}

export default DashboardLayout
