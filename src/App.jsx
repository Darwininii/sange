import { Outlet } from '@tanstack/react-router'
import AppToastProvider from '@/components/providers/AppToastProvider'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import PageOffline from '@/pages/PageOffline'

function App() {
  const isOnline = useOnlineStatus()

  if (!isOnline) {
    return <PageOffline />
  }

  return (
    <TooltipProvider>
      <AppToastProvider />
      <Outlet />
    </TooltipProvider>
  )
}

export default App
