import { isSupabaseConfigured, supabase } from '../lib/supabaseClient'

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
  return callAdminProfilesFunction('createProfile', profile)
}

export async function getMyProfile() {
  const data = await callAdminProfilesFunction('getMyProfile')
  return data.profile
}

export async function updateMyProfile(profile) {
  return callAdminProfilesFunction('updateMyProfile', profile)
}

export async function changeMyPassword({ password }) {
  return callAdminProfilesFunction('changeMyPassword', { password })
}

export async function changeProfilePassword(profileId, password) {
  return callAdminProfilesFunction('changePassword', { profileId, password })
}

export async function updateProfile(profileId, profile) {
  return callAdminProfilesFunction('updateProfile', { profileId, ...profile })
}

export async function revokeProfileAccess(profileId) {
  return callAdminProfilesFunction('revokeAccess', { profileId })
}

export async function reactivateProfileAccess(profileId) {
  return callAdminProfilesFunction('reactivateAccess', { profileId })
}

export async function deleteRevokedProfile(profileId) {
  return callAdminProfilesFunction('deleteRevokedProfile', { profileId })
}
