import { Outlet } from '@tanstack/react-router'
import AppToastProvider from '@/components/providers/AppToastProvider'
import { TooltipProvider } from '@/components/ui/tooltip'

function App() {
  return (
    <TooltipProvider>
      <AppToastProvider />
      <Outlet />
    </TooltipProvider>
  )
}

export default App
