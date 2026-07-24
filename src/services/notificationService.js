import { isSupabaseConfigured, supabase } from '../lib/supabaseClient'
import {
  activityActions,
  formatActorName,
  getActivityMessage,
} from './activityService'

export const notificationCategories = {
  orders: 'orders',
  inventory: 'inventory',
  profiles: 'profiles',
}

const ORDER_ACTIONS = [
  activityActions.order_create,
  activityActions.order_update,
  activityActions.order_message,
]

const INVENTORY_ACTIONS = [
  activityActions.inventory_create,
  activityActions.inventory_update,
  activityActions.inventory_delete,
]

const PROFILE_ACTIONS = [
  activityActions.profile_create,
  activityActions.profile_update,
  activityActions.profile_password_change,
  activityActions.profile_revoke,
  activityActions.profile_renew,
  activityActions.profile_delete,
]

/** Actions each role can receive as notifications. */
export function getNotificationActionsForRole(role) {
  switch (role) {
    case 'technician':
      return [...ORDER_ACTIONS]
    case 'cashier':
      return [...ORDER_ACTIONS, ...INVENTORY_ACTIONS]
    case 'admin':
      return [...ORDER_ACTIONS, ...INVENTORY_ACTIONS, ...PROFILE_ACTIONS]
    default:
      return [...ORDER_ACTIONS, ...INVENTORY_ACTIONS]
  }
}

export function getNotificationCategory(action) {
  if (ORDER_ACTIONS.includes(action)) {
    return notificationCategories.orders
  }

  if (INVENTORY_ACTIONS.includes(action)) {
    return notificationCategories.inventory
  }

  if (PROFILE_ACTIONS.includes(action)) {
    return notificationCategories.profiles
  }

  return null
}

export function getNotificationHref(activity, user = null) {
  const metadata = activity?.metadata ?? {}
  const category = getNotificationCategory(activity?.action)

  if (category === notificationCategories.orders) {
    const orderNumber = metadata.orderNumber ?? metadata.orderId

    if (user?.role === 'technician') {
      if (orderNumber) {
        return `/dashboard/orders/view/${orderNumber}`
      }
      return '/dashboard/orders'
    }

    if (orderNumber) {
      return `/dashboard/orders/edit/${orderNumber}`
    }
    return '/dashboard/orders'
  }

  if (category === notificationCategories.inventory) {
    return '/dashboard/inventory'
  }

  if (category === notificationCategories.profiles) {
    return '/dashboard/perfiles'
  }

  return '/dashboard'
}

export function formatNotificationTime(value) {
  if (!value) {
    return ''
  }

  const date = new Date(value)
  const diffMs = Date.now() - date.getTime()
  const diffSec = Math.max(0, Math.floor(diffMs / 1000))
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 45) {
    return 'ahora'
  }
  if (diffMin < 60) {
    return `${diffMin}m`
  }
  if (diffHour < 24) {
    return `${diffHour}h`
  }
  if (diffDay < 7) {
    return `${diffDay}d`
  }

  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
  }).format(date)
}

function isAssignmentNotification(activity) {
  const metadata = activity?.metadata ?? {}
  if (metadata.assigned) {
    return true
  }

  return (
    activity?.action === activityActions.order_create &&
    Boolean(metadata.technicianId)
  )
}

function getNotificationTitle(activity, user = null) {
  if (
    user?.role === 'technician' &&
    isAssignmentNotification(activity)
  ) {
    return 'Orden asignada'
  }

  switch (activity?.action) {
    case activityActions.order_create:
      return 'Nueva orden'
    case activityActions.order_update:
      return 'Orden actualizada'
    case activityActions.order_message:
      return 'Nuevo mensaje'
    case activityActions.inventory_create:
      return 'Producto creado'
    case activityActions.inventory_update:
      return 'Producto editado'
    case activityActions.inventory_delete:
      return 'Producto eliminado'
    case activityActions.profile_create:
      return 'Perfil creado'
    case activityActions.profile_update:
      return 'Perfil actualizado'
    case activityActions.profile_password_change:
      return 'Contraseña cambiada'
    case activityActions.profile_revoke:
      return 'Acceso revocado'
    case activityActions.profile_renew:
      return 'Acceso renovado'
    case activityActions.profile_delete:
      return 'Perfil eliminado'
    default:
      return 'Notificacion'
  }
}

function getNotificationSubtitle(activity, user = null) {
  const metadata = activity?.metadata ?? {}
  const actor = formatActorName(activity?.profiles)
  const clientRef = metadata.clientName
    ? String(metadata.clientName)
    : metadata.orderNumber
      ? `orden #${metadata.orderNumber}`
      : 'una orden'

  if (user?.role === 'technician' && isAssignmentNotification(activity)) {
    return `${actor} te asigno ${clientRef}`
  }

  if (activity?.action === activityActions.order_message) {
    const orderRef = metadata.orderNumber
      ? `orden #${metadata.orderNumber}`
      : 'una orden'
    const preview = String(metadata.preview ?? '').trim()
    if (preview) {
      return `${actor} en ${orderRef}: ${preview}`
    }
    return `${actor} escribio en ${orderRef}`
  }

  return getActivityMessage(activity)
}

/** Technicians only see orders assigned to them (and messages on those). */
function isRelevantForTechnician(activity, userId) {
  const metadata = activity?.metadata ?? {}
  const technicianId = String(metadata.technicianId ?? '')

  if (!technicianId || technicianId !== String(userId)) {
    return false
  }

  if (activity.action === activityActions.order_message) {
    return true
  }

  return isAssignmentNotification(activity)
}

export function mapActivityToNotification(activity, user = null) {
  const category = getNotificationCategory(activity?.action)

  if (!category) {
    return null
  }

  return {
    id: activity.id,
    action: activity.action,
    category,
    title: getNotificationTitle(activity, user),
    subtitle: getNotificationSubtitle(activity, user),
    time: formatNotificationTime(activity.created_at),
    createdAt: activity.created_at,
    href: getNotificationHref(activity, user),
    metadata: activity.metadata ?? {},
    userId: activity.user_id,
    unread: true,
  }
}

export async function getNotificationsForUser(user, { limit = 30 } = {}) {
  if (!isSupabaseConfigured || !supabase || !user?.id) {
    return []
  }

  const actions = getNotificationActionsForRole(user.role)

  if (actions.length === 0) {
    return []
  }

  const fetchLimit = user.role === 'technician' ? Math.max(limit * 3, 60) : limit

  const { data, error } = await supabase
    .from('activity_logs')
    .select('id, action, metadata, created_at, user_id')
    .in('action', actions)
    .neq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(fetchLimit)

  if (error) {
    throw new Error(`No se pudieron cargar las notificaciones: ${error.message}`)
  }

  let activityLogs = data ?? []

  if (user.role === 'technician') {
    activityLogs = activityLogs
      .filter((activity) => isRelevantForTechnician(activity, user.id))
      .slice(0, limit)
  }

  const userIds = [...new Set(activityLogs.map((item) => item.user_id))]

  if (userIds.length === 0) {
    return []
  }

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, name, last_name, role')
    .in('id', userIds)

  if (profilesError) {
    throw new Error(`No se pudieron cargar los perfiles: ${profilesError.message}`)
  }

  const profilesById = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile]),
  )

  return activityLogs
    .map((activity) =>
      mapActivityToNotification(
        {
          ...activity,
          profiles: profilesById.get(activity.user_id) ?? null,
        },
        user,
      ),
    )
    .filter(Boolean)
}

export function countUnreadByCategory(notifications, lastReadAt) {
  const threshold = lastReadAt ? new Date(lastReadAt).getTime() : 0
  const counts = {
    orders: 0,
    inventory: 0,
    profiles: 0,
    total: 0,
  }

  for (const item of notifications) {
    const created = new Date(item.createdAt).getTime()
    if (created <= threshold) {
      continue
    }

    counts.total += 1
    if (item.category === notificationCategories.orders) {
      counts.orders += 1
    } else if (item.category === notificationCategories.inventory) {
      counts.inventory += 1
    } else if (item.category === notificationCategories.profiles) {
      counts.profiles += 1
    }
  }

  return counts
}
