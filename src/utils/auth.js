import { demoUsers } from '../data/users'
import {
  getSupabaseConfigError,
  isSupabaseConfigured,
  supabase,
} from '../lib/supabaseClient'
import { loginWithNickname } from '../services/profileService'

const roleLabels = {
  admin: 'Administrador',
  cashier: 'Cajero',
  technician: 'Tecnico',
}

const roleAliases = {
  admin: 'admin',
  administrador: 'admin',
  cashier: 'cashier',
  cajero: 'cashier',
  technician: 'technician',
  tecnico: 'technician',
  'técnico': 'technician',
}

export class AuthError extends Error {
  constructor(message) {
    super(message)
    this.name = 'AuthError'
  }
}

function normalizeRole(role) {
  return roleAliases[String(role ?? '').trim().toLowerCase()]
}

function mapSupabaseUser(authUser, profile) {
  const role = normalizeRole(profile?.role ?? authUser.user_metadata?.role)

  if (!role) {
    throw new AuthError('El usuario no tiene un rol valido asignado.')
  }

  if (profile?.access_revoked) {
    throw new AuthError('El acceso de este perfil fue revocado.')
  }

  if (
    profile?.temporary_password_expires_at &&
    new Date(profile.temporary_password_expires_at) < new Date()
  ) {
    throw new AuthError('La contraseña temporal expiro. Contacta al administrador.')
  }

  return {
    id: authUser.id,
    name:
      profile?.name ??
      authUser.user_metadata?.name ??
      authUser.email?.split('@')[0] ??
      'Usuario',
    lastName: profile?.last_name ?? authUser.user_metadata?.last_name ?? '',
    nickname:
      profile?.nickname ??
      authUser.user_metadata?.nickname ??
      '',
    email: authUser.email,
    identification: profile?.identification ?? '',
    phone: profile?.phone ?? '',
    role,
    roleLabel: roleLabels[role] ?? 'Tecnico',
    mustChangePassword: Boolean(profile?.must_change_password),
  }
}

const profileSelect =
  'name, last_name, nickname, identification, phone, role, access_revoked, must_change_password, temporary_password_expires_at'

export async function authenticateUser(nickname, password) {
  const normalizedNickname = nickname.trim().toLowerCase()

  if (!isSupabaseConfigured) {
    const demoUser = demoUsers.find(
      (user) => user.nickname === normalizedNickname && user.password === password,
    )

    if (demoUser) {
      return demoUser
    }

    throw new AuthError(
      getSupabaseConfigError() ??
        'Supabase no esta configurado para iniciar sesion con usuarios reales.',
    )
  }

  const data = await loginWithNickname(normalizedNickname, password)

  if (!data?.session) {
    throw new AuthError('Credencial o contraseña incorrectos.')
  }

  const { error: sessionError } = await supabase.auth.setSession({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  })

  if (sessionError) {
    throw new AuthError(sessionError.message)
  }

  const authUser = data.user ?? data.session.user

  if (!authUser) {
    throw new AuthError('No se pudo obtener el usuario autenticado.')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select(profileSelect)
    .eq('id', authUser.id)
    .maybeSingle()

  if (profileError) {
    throw new AuthError(`No se pudo leer el perfil: ${profileError.message}`)
  }

  if (!profile) {
    throw new AuthError('El usuario existe, pero no tiene perfil en profiles.')
  }

  return mapSupabaseUser(authUser, profile)
}

export async function getCurrentSessionUser() {
  if (!isSupabaseConfigured) {
    return null
  }

  const { data, error } = await supabase.auth.getSession()

  if (error) {
    throw new AuthError(error.message)
  }

  if (!data.session?.user) {
    return null
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select(profileSelect)
    .eq('id', data.session.user.id)
    .maybeSingle()

  if (profileError) {
    throw new AuthError(`No se pudo leer el perfil: ${profileError.message}`)
  }

  if (!profile) {
    throw new AuthError('El usuario existe, pero no tiene perfil en profiles.')
  }

  return mapSupabaseUser(data.session.user, profile)
}

export async function signOutUser() {
  if (isSupabaseConfigured) {
    await supabase.auth.signOut()
  }
}
