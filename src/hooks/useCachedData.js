import { useCallback, useEffect, useRef, useState } from 'react'
import { useDataCacheStore } from '../store/dataCacheStore'
import { useAuthStore } from '../store/authStore'

export function useCachedData({
  cacheKey,
  fetcher,
  enabled = true,
  refetchInterval,
}) {
  const userId = useAuthStore((state) => state.user?.id)
  const getEntry = useDataCacheStore((state) => state.getEntry)
  const setEntry = useDataCacheStore((state) => state.setEntry)
  const removeEntry = useDataCacheStore((state) => state.removeEntry)

  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const requestIdRef = useRef(0)

  const loadData = useCallback(
    async ({ silent = false, force = false } = {}) => {
      if (!userId || !enabled) {
        return null
      }

      const requestId = requestIdRef.current + 1
      requestIdRef.current = requestId
      const existingCache = getEntry(userId, cacheKey)

      if (!silent) {
        if (force || existingCache === null) {
          setIsLoading(true)
        } else {
          setIsRefreshing(true)
        }
      }

      try {
        const result = await fetcher()
        const isLatestRequest = requestIdRef.current === requestId

        if (!isLatestRequest) {
          return null
        }

        setEntry(userId, cacheKey, result)
        setData(result)
        setError(null)
        return result
      } catch (loadError) {
        const isLatestRequest = requestIdRef.current === requestId

        if (!isLatestRequest) {
          return null
        }

        setError(loadError)
        throw loadError
      } finally {
        const isLatestRequest = requestIdRef.current === requestId

        if (!isLatestRequest) {
          return
        }

        if (!silent) {
          setIsLoading(false)
          setIsRefreshing(false)
        }
      }
    },
    [cacheKey, enabled, fetcher, getEntry, setEntry, userId],
  )

  const refetch = useCallback(
    async (options = {}) => {
      return loadData({
        silent: options.silent ?? false,
        force: options.force ?? true,
      })
    },
    [loadData],
  )

  const invalidate = useCallback(() => {
    if (!userId) {
      return
    }

    removeEntry(userId, cacheKey)
    setData(null)
  }, [cacheKey, removeEntry, userId])

  useEffect(() => {
    if (!enabled || !userId) {
      setData(null)
      setIsLoading(false)
      setError(null)
      return
    }

    const currentCache = getEntry(userId, cacheKey)

    if (currentCache !== null) {
      setData(currentCache)
      setIsLoading(false)
      setError(null)
      return
    }

    setIsLoading(true)
    loadData({ silent: false, force: false }).catch(() => {})
  }, [cacheKey, enabled, getEntry, loadData, userId])

  useEffect(() => {
    if (!enabled || !userId || !refetchInterval) {
      return undefined
    }

    const intervalId = window.setInterval(() => {
      loadData({ silent: true, force: true }).catch(() => {})
    }, refetchInterval)

    return () => window.clearInterval(intervalId)
  }, [cacheKey, enabled, loadData, refetchInterval, userId])

  const hasCache = userId ? getEntry(userId, cacheKey) !== null : false

  return {
    data,
    isLoading,
    isRefreshing,
    error,
    hasCache,
    refetch,
    invalidate,
  }
}
