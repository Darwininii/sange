import { isSupabaseConfigured, supabase } from '../lib/supabaseClient'
import {
  activityActions,
  registerActivitySafe,
} from './activityService'

function profileActivityName(profile) {
  return (
    [profile?.name, profile?.last_name || profile?.lastName]
      .filter(Boolean)
      .join(' ')
      .trim() ||
    profile?.nickname ||
    'Usuario'
  )
}

async function callAdminProfilesFunction(action, payload = {}) {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase no esta configurado.')
  }

  const { data, error } = await supabase.functions.invoke('admin-profiles', {
    body: { action, payload },
  })

  if (error) {
    if (error.message === 'Failed to send a request to the Edge Function') {
      throw new Error(
        'No se pudo conectar con la Edge Function admin-profiles. Verifica que este desplegada y que verify_jwt=false este configurado.',
      )
    }

    if (error.context) {
      try {
        const details = await error.context.json()
        const callerDetails = details.caller
          ? ` Usuario detectado: ${details.caller.email ?? 'sin correo'}, rol: ${details.caller.role ?? 'sin perfil'}.`
          : ''

        throw new Error(`${details.error ?? error.message}.${callerDetails}`)
      } catch (contextError) {
        if (contextError instanceof Error) {
          throw contextError
        }
      }
    }

    throw new Error(error.message)
  }

  if (data?.error) {
    throw new Error(data.error)
  }

  return data
}

export async function loginWithNickname(nickname, password) {
  return callAdminProfilesFunction('loginWithNickname', { nickname, password })
}

export async function getProfiles() {
  const data = await callAdminProfilesFunction('listProfiles')
  return data.profiles ?? []
}

export async function createProfile(profile) {
  const data = await callAdminProfilesFunction('createProfile', profile)
  const created = data?.profile ?? data

  await registerActivitySafe({
    action: activityActions.profile_create,
    metadata: {
      profileId: created?.id ?? '',
      profileName: profileActivityName(created?.id ? created : profile),
      nickname: created?.nickname || profile?.nickname || '',
    },
  })

  return data
}

export async function getMyProfile() {
  const data = await callAdminProfilesFunction('getMyProfile')
  return data.profile
}

export async function updateMyProfile(profile) {
  return callAdminProfilesFunction('updateMyProfile', profile)
}

export async function changeMyPassword({ password }) {
  const data = await callAdminProfilesFunction('changeMyPassword', { password })

  await registerActivitySafe({
    action: activityActions.profile_password_change,
    metadata: {
      profileName: 'mi perfil',
      self: true,
    },
  })

  return data
}

export async function changeProfilePassword(
  profileId,
  password,
  { profileName } = {},
) {
  const data = await callAdminProfilesFunction('changePassword', {
    profileId,
    password,
  })

  await registerActivitySafe({
    action: activityActions.profile_password_change,
    metadata: {
      profileId,
      profileName:
        profileName ||
        (data?.profile ? profileActivityName(data.profile) : profileId),
    },
  })

  return data
}

export async function updateProfile(profileId, profile) {
  const data = await callAdminProfilesFunction('updateProfile', {
    profileId,
    ...profile,
  })
  const updated = data?.profile ?? profile

  await registerActivitySafe({
    action: activityActions.profile_update,
    metadata: {
      profileId,
      profileName: profileActivityName(updated),
      nickname: updated?.nickname || profile?.nickname || '',
    },
  })

  return data
}

export async function revokeProfileAccess(profileId, { profileName } = {}) {
  const data = await callAdminProfilesFunction('revokeAccess', { profileId })

  await registerActivitySafe({
    action: activityActions.profile_revoke,
    metadata: {
      profileId,
      profileName:
        profileName ||
        (data?.profile ? profileActivityName(data.profile) : profileId),
    },
  })

  return data
}

export async function reactivateProfileAccess(
  profileId,
  { profileName } = {},
) {
  const data = await callAdminProfilesFunction('reactivateAccess', {
    profileId,
  })

  await registerActivitySafe({
    action: activityActions.profile_renew,
    metadata: {
      profileId,
      profileName:
        profileName ||
        (data?.profile ? profileActivityName(data.profile) : profileId),
    },
  })

  return data
}

export async function deleteRevokedProfile(profileId, { profileName } = {}) {
  const data = await callAdminProfilesFunction('deleteRevokedProfile', {
    profileId,
  })

  await registerActivitySafe({
    action: activityActions.profile_delete,
    metadata: {
      profileId,
      profileName:
        profileName ||
        (data?.profile ? profileActivityName(data.profile) : profileId),
    },
  })

  return data
}
