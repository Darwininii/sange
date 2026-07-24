import { useEffect, useState } from 'react'

function getOnlineStatus() {
  if (typeof navigator === 'undefined') {
    return true
  }

  return navigator.onLine
}

/**
 * Tracks browser online/offline status.
 * Updates on `online` / `offline` window events.
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(getOnlineStatus)

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true)
    }

    function handleOffline() {
      setIsOnline(false)
    }

    setIsOnline(getOnlineStatus())
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}
