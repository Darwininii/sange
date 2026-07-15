import { useCallback, useState } from 'react'

export const DEFAULT_PAGE_SIZE = 15

const STORAGE_PREFIX = 'sange:pagination:'

export const PAGE_SIZE_OPTIONS = [
  { value: 'default', label: 'Default' },
  { value: '5', label: '5' },
  { value: '10', label: '10' },
  { value: '15', label: '15' },
  { value: '20', label: '20' },
  { value: '30', label: '30' },
]

function readStoredSize(key, fallback) {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    if (raw == null) return fallback
    const parsed = Number(raw)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
  } catch {
    return fallback
  }
}

function writeStoredSize(key, value) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, String(value))
  } catch {
    // Ignore write errors (private mode, quota, etc.)
  }
}

/**
 * Reusable pagination state with page-size persistence.
 *
 * @param {Object} params
 * @param {number} params.totalItems  Total number of items to paginate.
 * @param {string} params.storageKey  Unique key to remember the user's page size per list.
 * @param {number} params.defaultPageSize  System default page size (15).
 */
export function usePagination({
  totalItems = 0,
  storageKey = 'default',
  defaultPageSize = DEFAULT_PAGE_SIZE,
} = {}) {
  const fullKey = `${STORAGE_PREFIX}${storageKey}`

  const [pageSize, setPageSizeState] = useState(() =>
    readStoredSize(fullKey, defaultPageSize),
  )
  const [page, setPage] = useState(1)

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const currentPage = Math.min(Math.max(page, 1), totalPages)

  const setPageSize = useCallback(
    (next) => {
      const resolved = next === 'default' ? defaultPageSize : Number(next)
      const safe =
        Number.isFinite(resolved) && resolved > 0 ? resolved : defaultPageSize
      setPageSizeState(safe)
      setPage(1)
      writeStoredSize(fullKey, safe)
    },
    [defaultPageSize, fullKey],
  )

  const goToPage = useCallback(
    (next) => {
      setPage(() => Math.min(Math.max(Number(next) || 1, 1), totalPages))
    },
    [totalPages],
  )

  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize

  const paginate = useCallback(
    (items) => (Array.isArray(items) ? items.slice(startIndex, endIndex) : []),
    [startIndex, endIndex],
  )

  return {
    page: currentPage,
    setPage: goToPage,
    pageSize,
    setPageSize,
    totalPages,
    startIndex,
    endIndex,
    paginate,
    defaultPageSize,
  }
}
