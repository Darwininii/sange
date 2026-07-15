import { Toaster } from 'react-hot-toast'
import { TOAST_TIMEOUT } from '@/hooks/appToast'

function AppToastProvider() {
  return (
    <Toaster
      position="top-right"
      reverseOrder={false}
      gutter={12}
      containerClassName="sange-toast-host"
      containerStyle={{
        top: 16,
        right: 16,
        zIndex: 60,
      }}
      toastOptions={{
        duration: TOAST_TIMEOUT,
        style: {
          maxWidth: 360,
          padding: 0,
          background: 'transparent',
          boxShadow: 'none',
        },
      }}
    />
  )
}

export default AppToastProvider
