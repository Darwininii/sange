import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { IoSearchCircleSharp } from 'react-icons/io5'
import DashboardLayout from '../components/layout/DashboardLayout'
import Loader from '../hooks/Loader'
import appToast from '../hooks/appToast'
import CustomBadge from '../shared/CustomBadge'
import DashboardListSection from '../shared/DashboardListSection'
import Pagination from '../shared/Pagination'
import AppSelect from '../shared/select'
import {
  formatActivityDateTime,
  formatActorName,
  getActivityLogs,
  getActivityMessage,
  getRegisteredUsers,
} from '../services/activityService'
import { useCachedData } from '../hooks/useCachedData'
import { usePagination } from '../hooks/usePagination'
import { useAuthStore } from '../store/authStore'
import { signOutUser } from '../utils/auth'

const refreshIntervalMs = 10000

function matchesActivitySearch(activity, query) {
  if (!query) {
    return true
  }

  const normalized = query.toLowerCase()
  const haystack = [
    getActivityMessage(activity),
    formatActorName(activity.profiles),
    activity.profiles?.role,
    formatActivityDateTime(activity.created_at),
    activity.action,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return haystack.includes(normalized)
}

function DashboardHistoryPage() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const [search, setSearch] = useState('')
  const [selectedUserId, setSelectedUserId] = useState('')

  const activityCacheKey = useMemo(
    () => `activity-data:${selectedUserId || 'all'}`,
    [selectedUserId],
  )

  const fetchActivityData = useCallback(async () => {
    const [registeredUsers, activityLogs] = await Promise.all([
      getRegisteredUsers(),
      getActivityLogs(selectedUserId),
    ])

    return {
      users: registeredUsers,
      activities: activityLogs,
    }
  }, [selectedUserId])

  const {
    data: activityData,
    isLoading,
    error,
  } = useCachedData({
    cacheKey: activityCacheKey,
    fetcher: fetchActivityData,
    enabled: Boolean(user?.id),
    refetchInterval: refreshIntervalMs,
  })

  const users = activityData?.users ?? []
  const activities = Array.isArray(activityData?.activities)
    ? activityData.activities
    : []

  const userFilterOptions = useMemo(
    () => [
      { value: 'all', label: 'Todos los usuarios' },
      ...users.map((profile) => ({
        value: profile.id,
        label: formatActorName(profile),
      })),
    ],
    [users],
  )

  const filteredActivities = useMemo(
    () =>
      activities.filter((activity) =>
        matchesActivitySearch(activity, search.trim()),
      ),
    [activities, search],
  )

  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    paginate,
  } = usePagination({
    totalItems: filteredActivities.length,
    storageKey: 'activity-history',
  })

  const visibleActivities = paginate(filteredActivities)

  useEffect(() => {
    setPage(1)
  }, [search, selectedUserId, setPage])

  useEffect(() => {
    if (!error) {
      return
    }

    appToast.danger(
      error instanceof Error
        ? error.message
        : 'No se pudo cargar el historial.',
    )
  }, [error])

  async function handleLogout() {
    await signOutUser()
    logout()
    navigate({ to: '/' })
  }

  return (
    <DashboardLayout user={user} onLogout={handleLogout}>
      <DashboardListSection
        title="Historial de actividades"
        sectionTitle="Actividades registradas"
        description="Consulta inicios de sesion, accesos con sesion activa y cambios en clientes, perfiles, inventario y ordenes."
        showCreate={false}
        actions={
          <>
            <div className="relative w-full min-w-[16rem] sm:w-72 sm:max-w-xs">
              <IoSearchCircleSharp className="pointer-events-none absolute left-3 top-1/2 size-6.5 -translate-y-1/2 text-foreground/45" />
              <input
                className="w-full rounded-2xl border border-border bg-background py-2.5 pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/20"
                value={search}
                placeholder="Buscar actividad..."
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Buscar actividades"
              />
            </div>

            <div className="w-full min-w-[12rem] sm:w-56">
              <AppSelect
                value={selectedUserId || 'all'}
                options={userFilterOptions}
                placeholder="Filtrar por usuario"
                className="py-2.5 text-sm"
                onValueChange={(nextValue) =>
                  setSelectedUserId(nextValue === 'all' ? '' : nextValue)
                }
              />
            </div>
          </>
        }
      >
        {isLoading ? (
          <div className="flex justify-center rounded-3xl bg-background px-5 py-8">
            <Loader
              label="Cargando historial..."
              className="text-foreground/55 [&>svg]:text-black/70 dark:[&>svg]:text-white/70"
            />
          </div>
        ) : activities.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-background px-5 py-10 text-center">
            <p className="font-semibold text-foreground">
              Aún no hay actividades registradas
            </p>
            <p className="mt-2 text-sm text-foreground/55">
              Las acciones de usuarios apareceran aqui automaticamente.
            </p>
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-background px-5 py-10 text-center">
            <p className="font-semibold text-foreground">Sin resultados</p>
            <p className="mt-2 text-sm text-foreground/55">
              No hay actividades que coincidan con la busqueda o el filtro.
            </p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-border overflow-hidden rounded-3xl border border-border">
              {visibleActivities.map((activity) => (
                <article
                  className="flex flex-wrap items-center justify-between gap-3 bg-background/40 px-5 py-4"
                  key={activity.id}
                >
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">
                      {getActivityMessage(activity)}
                    </p>
                    <p className="mt-1 text-xs text-foreground/45">
                      {formatActivityDateTime(activity.created_at)}
                    </p>
                  </div>
                  <CustomBadge
                    color="blue"
                    label={activity.profiles?.role ?? 'usuario'}
                  />
                </article>
              ))}
            </div>

            <div className="mt-6">
              <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
                pageSize={pageSize}
                onPageSizeChange={setPageSize}
              />
            </div>
          </>
        )}
      </DashboardListSection>
    </DashboardLayout>
  )
}

export default DashboardHistoryPage
