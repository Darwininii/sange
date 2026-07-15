import { isSupabaseConfigured, supabase } from '../lib/supabaseClient'

export const activityActions = {
  login: 'login',
}

export async function registerActivity({ userId, action, metadata = {} }) {
  if (!isSupabaseConfigured || !userId) {
    return
  }

  const { error } = await supabase.from('activity_logs').insert({
    user_id: userId,
    action,
    metadata,
  })

  if (error) {
    throw new Error(`No se pudo registrar la actividad: ${error.message}`)
  }
}

export async function getRegisteredUsers() {
  if (!isSupabaseConfigured) {
    return []
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, role')
    .order('name', { ascending: true })

  if (error) {
    throw new Error(`No se pudieron cargar los usuarios: ${error.message}`)
  }

  return data ?? []
}

export async function getActivityLogs(userId) {
  if (!isSupabaseConfigured) {
    return []
  }

  let query = supabase
    .from('activity_logs')
    .select('id, action, created_at, user_id')
    .order('created_at', { ascending: false })
    .limit(50)

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
    .select('id, name, role')
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
