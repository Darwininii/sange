import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  activityActions,
  getActivityLogs,
  getRegisteredUsers,
} from '../../services/activityService'
import Loader from '../../hooks/Loader'
import appToast from '../../hooks/appToast'
import { useCachedData } from '../../hooks/useCachedData'
import { useAuthStore } from '../../store/authStore'
import CustomBadge from '../../shared/CustomBadge'

const refreshIntervalMs = 10000

function formatActivityTime(value) {
  return new Intl.DateTimeFormat('es-CO', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(value))
}

function getActivityText(activity) {
  const userName = activity.profiles?.name ?? 'Usuario'
  const time = formatActivityTime(activity.created_at)

  if (activity.action === activityActions.login) {
    return `${userName} inicio sesion - ${time}`
  }

  return `${userName} realizó una actividad - ${time}`
}

function ActivityHistory() {
  const userId = useAuthStore((state) => state.user?.id)
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
    enabled: Boolean(userId),
    refetchInterval: refreshIntervalMs,
  })

  const users = activityData?.users ?? []
  const activities = activityData?.activities ?? []

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

  return (
    <section className="mt-10 rounded-[2rem] bg-surface p-6 shadow-sm ring-1 ring-border">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="mt-2 font-display text-3xl font-semibold text-foreground">
            Actividades de usuarios
          </h2>
          <p className="mt-2 text-sm text-foreground/55">
            Registro administrativo con actualizacion cada 10 segundos.
          </p>
        </div>

        <label className="w-full max-w-xs">
          <span className="mb-2 block text-sm font-medium text-foreground/85">
            Filtrar por usuario
          </span>
          <select
            className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary focus:bg-surface focus:ring-4 focus:ring-primary/20"
            value={selectedUserId}
            onChange={(event) => setSelectedUserId(event.target.value)}
          >
            <option value="">Todos los usuarios</option>
            {users.map((user) => (
              <option value={user.id} key={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-6 divide-y divide-border overflow-hidden rounded-3xl border border-border">
        {isLoading ? (
          <div className="flex justify-center bg-background px-5 py-8">
            <Loader
              label="Cargando historial..."
              size="md"
              className="text-foreground/55 [&>svg]:text-primary"
            />
          </div>
        ) : activities.length > 0 ? (
          activities.map((activity) => (
            <article
              className="flex flex-wrap items-center justify-between gap-3 bg-surface px-5 py-4"
              key={activity.id}
            >
              <p className="font-medium text-foreground">
                {getActivityText(activity)}
              </p>
              <CustomBadge
                color="blue"
                label={activity.profiles?.role ?? 'usuario'}
              />
            </article>
          ))
        ) : (
          <p className="bg-background px-5 py-4 text-sm text-foreground/55">
            No hay actividades registradas para este filtro.
          </p>
        )}
      </div>
    </section>
  )
}

export default ActivityHistory
