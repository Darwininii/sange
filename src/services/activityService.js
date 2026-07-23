import { isSupabaseConfigured, supabase } from '../lib/supabaseClient'

export const activityActions = {
  login: 'login',
  session_resume: 'session_resume',
  client_create: 'client_create',
  client_update: 'client_update',
  client_delete: 'client_delete',
  profile_create: 'profile_create',
  profile_update: 'profile_update',
  profile_password_change: 'profile_password_change',
  profile_revoke: 'profile_revoke',
  profile_renew: 'profile_renew',
  profile_delete: 'profile_delete',
  inventory_create: 'inventory_create',
  inventory_update: 'inventory_update',
  inventory_delete: 'inventory_delete',
  order_create: 'order_create',
  order_update: 'order_update',
}

const SESSION_ACTIVITY_KEY_PREFIX = 'sange:activity-session:'

function sessionActivityKey(userId) {
  return `${SESSION_ACTIVITY_KEY_PREFIX}${userId}`
}

export function clearSessionActivityFlag(userId) {
  if (!userId || typeof window === 'undefined') {
    return
  }

  try {
    window.sessionStorage.removeItem(sessionActivityKey(userId))
  } catch {
    // Ignore storage errors.
  }
}

function markSessionActivityFlag(userId) {
  if (!userId || typeof window === 'undefined') {
    return
  }

  try {
    window.sessionStorage.setItem(sessionActivityKey(userId), '1')
  } catch {
    // Ignore storage errors.
  }
}

function hasSessionActivityFlag(userId) {
  if (!userId || typeof window === 'undefined') {
    return false
  }

  try {
    return Boolean(window.sessionStorage.getItem(sessionActivityKey(userId)))
  } catch {
    return false
  }
}

async function resolveActorUserId(explicitUserId) {
  if (explicitUserId) {
    return explicitUserId
  }

  if (!isSupabaseConfigured || !supabase) {
    return null
  }

  const { data, error } = await supabase.auth.getUser()

  if (error || !data?.user?.id) {
    return null
  }

  return data.user.id
}

export async function registerActivity({ userId, action, metadata = {} } = {}) {
  if (!isSupabaseConfigured || !supabase || !action) {
    return
  }

  const actorId = await resolveActorUserId(userId)

  if (!actorId) {
    return
  }

  const { error } = await supabase.from('activity_logs').insert({
    user_id: actorId,
    action,
    metadata: metadata && typeof metadata === 'object' ? metadata : {},
  })

  if (error) {
    throw new Error(`No se pudo registrar la actividad: ${error.message}`)
  }
}

/** Never throws — use after successful mutations. */
export async function registerActivitySafe(payload) {
  try {
    await registerActivity(payload)
  } catch (error) {
    console.error(error)
  }
}

/**
 * Logs credential login once and marks this browser tab session
 * so a later resume is not double-counted.
 */
export async function registerLoginActivity(user) {
  if (!user?.id) {
    return
  }

  markSessionActivityFlag(user.id)
  await registerActivitySafe({
    userId: user.id,
    action: activityActions.login,
    metadata: {
      nickname: user.nickname ?? '',
      email: user.email ?? '',
      source: 'credentials',
    },
  })
}

/**
 * When the user already has an active session (refresh / reopen app),
 * register one access event per browser tab session.
 */
export async function trackSessionAccess(user) {
  if (!user?.id) {
    return
  }

  if (hasSessionActivityFlag(user.id)) {
    return
  }

  markSessionActivityFlag(user.id)
  await registerActivitySafe({
    userId: user.id,
    action: activityActions.session_resume,
    metadata: {
      nickname: user.nickname ?? '',
      email: user.email ?? '',
      source: 'session_restore',
    },
  })
}

export async function getRegisteredUsers() {
  if (!isSupabaseConfigured || !supabase) {
    return []
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, last_name, role')
    .order('name', { ascending: true })

  if (error) {
    throw new Error(`No se pudieron cargar los usuarios: ${error.message}`)
  }

  return data ?? []
}

export async function getActivityLogs(userId) {
  if (!isSupabaseConfigured || !supabase) {
    return []
  }

  let query = supabase
    .from('activity_logs')
    .select('id, action, metadata, created_at, user_id')
    .order('created_at', { ascending: false })
    .limit(100)

  if (userId) {
    query = query.eq('user_id', userId)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`No se pudo cargar el historial: ${error.message}`)
  }

  const activityLogs = data ?? []
  const userIds = [...new Set(activityLogs.map((activity) => activity.user_id))]

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

  return activityLogs.map((activity) => ({
    ...activity,
    profiles: profilesById.get(activity.user_id) ?? null,
  }))
}

export function formatActorName(profile) {
  const fullName = [profile?.name, profile?.last_name]
    .filter(Boolean)
    .join(' ')
    .trim()

  return fullName || profile?.name || 'Usuario'
}

export function formatActivityDateTime(value) {
  if (!value) {
    return ''
  }

  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(value))
}

function metaLabel(metadata, keys, fallback = '') {
  for (const key of keys) {
    const value = String(metadata?.[key] ?? '').trim()
    if (value) {
      return value
    }
  }

  return fallback
}

export function getActivityMessage(activity) {
  const userName = formatActorName(activity?.profiles)
  const metadata = activity?.metadata ?? {}
  const target = metaLabel(metadata, [
    'name',
    'clientName',
    'productName',
    'profileName',
    'orderId',
    'nickname',
  ])
  const targetSuffix = target ? ` (${target})` : ''

  switch (activity?.action) {
    case activityActions.login:
      return `${userName} inicio sesion`
    case activityActions.session_resume:
      return `${userName} ingreso con sesion activa`
    case activityActions.client_create:
      return `${userName} creo un cliente${targetSuffix}`
    case activityActions.client_update:
      return `${userName} edito un cliente${targetSuffix}`
    case activityActions.client_delete:
      return `${userName} elimino un cliente${targetSuffix}`
    case activityActions.profile_create:
      return `${userName} creo un perfil${targetSuffix}`
    case activityActions.profile_update:
      return `${userName} edito un perfil${targetSuffix}`
    case activityActions.profile_password_change:
      return `${userName} cambio la contraseña de un perfil${targetSuffix}`
    case activityActions.profile_revoke:
      return `${userName} revoco un perfil${targetSuffix}`
    case activityActions.profile_renew:
      return `${userName} renovo un perfil${targetSuffix}`
    case activityActions.profile_delete:
      return `${userName} elimino un perfil${targetSuffix}`
    case activityActions.inventory_create:
      return `${userName} creo un producto${targetSuffix}`
    case activityActions.inventory_update:
      return `${userName} edito un producto${targetSuffix}`
    case activityActions.inventory_delete:
      return `${userName} elimino un producto${targetSuffix}`
    case activityActions.order_create:
      return `${userName} creo una orden${targetSuffix}`
    case activityActions.order_update:
      return `${userName} edito una orden${targetSuffix}`
    default:
      return `${userName} realizo una actividad`
  }
}
