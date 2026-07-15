import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
}

const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  cashier: 'Cajero',
  technician: 'Tecnico',
}

const PLATFORM_NAME = 'Sange'
const PLATFORM_TEAM = 'Equipo de Sange'
const NICKNAME_PATTERN = /^[a-z0-9]+-[a-z0-9]+(\d*)$/

function getFirstWord(value: string) {
  return String(value ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)[0] ?? ''
}

function normalizeNicknamePart(value: string) {
  return getFirstWord(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

function buildNicknameBase(name: string, lastName: string) {
  const firstName = normalizeNicknamePart(name)
  const firstLastName = normalizeNicknamePart(lastName)

  if (!firstName || !firstLastName) {
    return ''
  }

  return `${firstName}-${firstLastName}`
}

function normalizeNickname(value: string) {
  return String(value ?? '').trim().toLowerCase()
}

function assertValidNickname(nickname: string) {
  const normalizedNickname = normalizeNickname(nickname)

  if (!NICKNAME_PATTERN.test(normalizedNickname)) {
    throw new Error(
      'La credencial solo puede usar letras, numeros y un guion entre nombre y apellido.',
    )
  }
}

async function assertNicknameAvailable(
  adminClient: ReturnType<typeof createClient>,
  nickname: string,
  excludeProfileId?: string,
) {
  const normalizedNickname = normalizeNickname(nickname)

  let query = adminClient
    .from('profiles')
    .select('id')
    .eq('nickname', normalizedNickname)

  if (excludeProfileId) {
    query = query.neq('id', excludeProfileId)
  }

  const { data, error } = await query.maybeSingle()

  if (error) {
    throw error
  }

  if (data) {
    throw new Error('Esta credencial ya esta en uso.')
  }
}

async function assertNicknameSuffixRules(
  adminClient: ReturnType<typeof createClient>,
  {
    name,
    lastName,
    nickname,
    excludeProfileId,
  }: {
    name: string
    lastName: string
    nickname: string
    excludeProfileId?: string
  },
) {
  const base = buildNicknameBase(name, lastName)
  const normalizedNickname = normalizeNickname(nickname)

  if (!base || !normalizedNickname.startsWith(base)) {
    throw new Error('La credencial no coincide con el nombre y apellido ingresados.')
  }

  let query = adminClient
    .from('profiles')
    .select('id, name, last_name, nickname')
    .neq('id', excludeProfileId ?? '00000000-0000-0000-0000-000000000000')

  const { data: profiles, error } = await query

  if (error) {
    throw error
  }

  const matches = (profiles ?? []).filter((profile) => {
    if (excludeProfileId && profile.id === excludeProfileId) {
      return false
    }

    return buildNicknameBase(profile.name, profile.last_name) === base
  })

  const suffix = normalizedNickname.slice(base.length)

  if (matches.length > 0 && !suffix) {
    throw new Error(
      'Ya existe un usuario con el mismo nombre y apellido. Debes agregar numeracion.',
    )
  }
}

function escapeHtml(value: string) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function compactHtml(html: string) {
  return html
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/>\s+</g, '><')
    .replace(/\s*\n\s*/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function sanitizePlainText(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .join('\n')
    .trim()
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}

function getEnv(name: string) {
  const value = Deno.env.get(name)

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`)
  }

  return value
}

function assertRole(role: string) {
  if (!['admin', 'cashier', 'technician'].includes(role)) {
    throw new Error('Rol invalido.')
  }
}

function assertPhone(phone: string) {
  const normalizedPhone = String(phone ?? '').trim()

  if (normalizedPhone && normalizedPhone.length < 10) {
    throw new Error('Si ingresas numero celular, debe tener al menos 10 caracteres.')
  }
}

function assertRequired(value: unknown, fieldName: string) {
  if (!String(value ?? '').trim()) {
    throw new Error(`${fieldName} es obligatorio.`)
  }
}

function assertIdentification(identification: string) {
  if (String(identification ?? '').trim().length < 8) {
    throw new Error('La cedula debe tener al menos 8 caracteres.')
  }
}

async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string
  subject: string
  html: string
  text: string
}) {
  const gmailUser = Deno.env.get('GMAIL_USER')?.trim()
  const gmailAppPassword = Deno.env.get('GMAIL_APP_PASSWORD')?.replace(/\s+/g, '')

  if (!gmailUser || !gmailAppPassword) {
    return { sent: false, reason: 'Email provider not configured' }
  }

  const client = new SMTPClient({
    connection: {
      hostname: 'smtp.gmail.com',
      port: 465,
      tls: true,
      auth: {
        username: gmailUser,
        password: gmailAppPassword,
      },
    },
  })

  try {
    // HTML en una sola linea: evita que quoted-printable inserte "=20"
    // (espacio al final de linea) que Gmail muestra como texto literal.
    const safeHtml = compactHtml(html)
    const safeText = sanitizePlainText(text)

    await client.send({
      from: `${PLATFORM_TEAM} <${gmailUser}>`,
      to,
      subject,
      content: safeText,
      html: safeHtml,
    })

    return { sent: true }
  } catch (error) {
    return {
      sent: false,
      reason:
        error instanceof Error ? error.message : 'Error desconocido al enviar el correo.',
    }
  } finally {
    try {
      await client.close()
    } catch {
      // La conexion ya pudo haberse cerrado por un error previo.
    }
  }
}

function buildEmailLayout({
  title,
  preview,
  bodyHtml,
}: {
  title: string
  preview: string
  bodyHtml: string
}) {
  return `
<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
      ${escapeHtml(preview)}
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 12px 40px rgba(15,23,42,0.08);">
            <tr>
              <td style="background:linear-gradient(135deg,#0f172a 0%,#1d4ed8 100%);padding:28px 32px;">
                <p style="margin:0;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#93c5fd;font-weight:700;">
                  ${escapeHtml(PLATFORM_TEAM)}
                </p>
                <h1 style="margin:10px 0 0;font-size:24px;line-height:1.3;color:#ffffff;font-weight:800;">
                  ${escapeHtml(title)}
                </h1>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 28px;">
                <p style="margin:0;font-size:13px;line-height:1.6;color:#64748b;">
                  Este mensaje fue enviado por el ${escapeHtml(PLATFORM_TEAM)}. Si no esperabas este correo, contacta a tu administrador.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `.trim()
}

function buildCredentialCard({
  nickname,
  password,
}: {
  nickname?: string
  password: string
}) {
  const credentialRow = nickname
    ? `
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;">
          <p style="margin:0;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;">Credencial</p>
          <p style="margin:6px 0 0;font-size:16px;color:#0f172a;font-weight:700;font-family:Consolas,Monaco,monospace;">${escapeHtml(nickname)}</p>
        </td>
      </tr>
    `
    : ''

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0;background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
      ${credentialRow}
      <tr>
        <td style="padding:12px 16px;">
          <p style="margin:0;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;">Contraseña</p>
          <p style="margin:6px 0 0;font-size:16px;color:#0f172a;font-weight:700;font-family:Consolas,Monaco,monospace;">${escapeHtml(password)}</p>
        </td>
      </tr>
    </table>
  `
}

function buildWelcomeEmailHtml({
  name,
  nickname,
  email,
  password,
  expiresAt,
}: {
  name: string
  nickname: string
  email: string
  password: string
  expiresAt: string
}) {
  const expiresLabel = new Date(expiresAt).toLocaleString('es-CO')

  return buildEmailLayout({
    title: 'Bienvenido a la plataforma de Sange',
    preview: 'Tus credenciales de acceso ya estan listas.',
    bodyHtml: `
      <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#334155;">
        Hola <strong>${escapeHtml(name)}</strong>,
      </p>
      <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#334155;">
        Desde el ${escapeHtml(PLATFORM_TEAM)}, te damos tus credenciales de acceso.
      </p>
      ${buildCredentialCard({ nickname, password })}
      <div style="margin:0 0 20px;padding:14px 16px;background:#fff7ed;border:1px solid #fed7aa;border-radius:14px;">
        <p style="margin:0;font-size:14px;line-height:1.6;color:#9a3412;">
          Recuerda que la contraseña es temporal y tiene una duracion de 24 horas.
          Por favor cambiala lo antes posible. Expira el <strong>${escapeHtml(expiresLabel)}</strong>.
        </p>
      </div>
      <p style="margin:0;font-size:16px;line-height:1.6;color:#334155;">
        Ten un buen dia :)
      </p>
    `,
  })
}

function buildWelcomeEmailText({
  name,
  nickname,
  email,
  password,
  expiresAt,
}: {
  name: string
  nickname: string
  email: string
  password: string
  expiresAt: string
}) {
  const expiresLabel = new Date(expiresAt).toLocaleString('es-CO')

  return [
    `Hola ${name},`,
    '',
    `Desde el ${PLATFORM_TEAM}, te damos tus credenciales de acceso.`,
    '',
    `Credencial: ${nickname}`,
    `Contraseña: ${password}`,
    '',
    'Recuerda que la contraseña es temporal y tiene una duracion de 24 horas. Por favor cambiala lo antes posible.',
    `Expira el ${expiresLabel}.`,
    '',
    'Ten un buen dia :)',
  ].join('\n')
}

function buildPasswordChangedEmailHtml({
  name,
  password,
  expiresAt,
}: {
  name: string
  password: string
  expiresAt: string
}) {
  const expiresLabel = new Date(expiresAt).toLocaleString('es-CO')

  return buildEmailLayout({
    title: 'Cambio de contraseña',
    preview: 'Tu contraseña de acceso ha sido actualizada.',
    bodyHtml: `
      <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#334155;">
        Hola <strong>${escapeHtml(name)}</strong>,
      </p>
      <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#334155;">
        Desde el ${escapeHtml(PLATFORM_TEAM)}, te informamos que tu contraseña de acceso ha sido cambiada.
      </p>
      ${buildCredentialCard({ password })}
      <div style="margin:0;padding:14px 16px;background:#fff7ed;border:1px solid #fed7aa;border-radius:14px;">
        <p style="margin:0;font-size:14px;line-height:1.6;color:#9a3412;">
          Recuerda que la contraseña es temporal y debes cambiarla. Tiene una duracion de 24 horas,
          asi que por favor cambiala lo antes posible. Expira el <strong>${escapeHtml(expiresLabel)}</strong>.
        </p>
      </div>
    `,
  })
}

function buildPasswordChangedEmailText({
  name,
  password,
  expiresAt,
}: {
  name: string
  password: string
  expiresAt: string
}) {
  const expiresLabel = new Date(expiresAt).toLocaleString('es-CO')

  return [
    `Hola ${name},`,
    '',
    `Desde el ${PLATFORM_TEAM}, te informamos que tu contraseña de acceso ha sido cambiada.`,
    '',
    `Contraseña: ${password}`,
    '',
    'Recuerda que la contraseña es temporal y debes cambiarla. Tiene una duracion de 24 horas, asi que por favor cambiala lo antes posible.',
    `Expira el ${expiresLabel}.`,
  ].join('\n')
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = getEnv('SUPABASE_URL')
    const anonKey = getEnv('SUPABASE_ANON_KEY')
    const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY')
    const adminClient = createClient(supabaseUrl, serviceRoleKey)
    const { action, payload = {} } = await request.json()

    if (action === 'loginWithNickname') {
      const { nickname, password } = payload

      assertRequired(nickname, 'Credencial')
      assertRequired(password, 'Contraseña')
      assertValidNickname(nickname)

      const normalizedNickname = normalizeNickname(nickname)

      const { data: profile, error: profileError } = await adminClient
        .from('profiles')
        .select('email, access_revoked')
        .eq('nickname', normalizedNickname)
        .maybeSingle()

      if (profileError) {
        throw profileError
      }

      if (!profile?.email || profile.access_revoked) {
        return jsonResponse({ error: 'Credencial o contraseña incorrectos.' }, 401)
      }

      const loginClient = createClient(supabaseUrl, anonKey)
      const { data: authData, error: authError } =
        await loginClient.auth.signInWithPassword({
          email: profile.email,
          password,
        })

      if (authError || !authData.session) {
        return jsonResponse({ error: 'Credencial o contraseña incorrectos.' }, 401)
      }

      return jsonResponse({
        session: authData.session,
        user: authData.user,
      })
    }

    const authorization = request.headers.get('Authorization')

    if (!authorization) {
      return jsonResponse({ error: 'No autorizado.' }, 401)
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
    })

    const {
      data: { user: caller },
      error: callerError,
    } = await userClient.auth.getUser()

    if (callerError || !caller) {
      return jsonResponse({ error: 'No autorizado.' }, 401)
    }

    const { data: callerProfile } = await adminClient
      .from('profiles')
      .select(
        'id, name, last_name, nickname, email, identification, phone, role, access_revoked, must_change_password, temporary_password_expires_at',
      )
      .eq('id', caller.id)
      .maybeSingle()

    if (!callerProfile) {
      return jsonResponse({ error: 'Perfil no encontrado.' }, 404)
    }

    if (callerProfile.access_revoked) {
      return jsonResponse({ error: 'El acceso de este perfil fue revocado.' }, 403)
    }

    if (action === 'getMyProfile') {
      return jsonResponse({
        profile: {
          ...callerProfile,
          email: callerProfile.email ?? caller.email,
        },
      })
    }

    if (action === 'updateMyProfile') {
      const { phone } = payload
      assertPhone(phone)

      const { error: updateProfileError } = await adminClient
        .from('profiles')
        .update({ phone })
        .eq('id', caller.id)

      if (updateProfileError) {
        throw updateProfileError
      }

      return jsonResponse({ updated: true, profile: { ...callerProfile, phone } })
    }

    if (action === 'changeMyPassword') {
      const { password } = payload

      if (!password) {
        return jsonResponse({ error: 'La nueva contraseña es requerida.' }, 400)
      }

      const { error: passwordError } =
        await adminClient.auth.admin.updateUserById(caller.id, {
          password,
        })

      if (passwordError) {
        throw passwordError
      }

      const { error: updateProfileError } = await adminClient
        .from('profiles')
        .update({
          must_change_password: false,
          temporary_password_expires_at: null,
        })
        .eq('id', caller.id)

      if (updateProfileError) {
        throw updateProfileError
      }

      return jsonResponse({ updated: true })
    }

    if (callerProfile.role !== 'admin') {
      return jsonResponse(
        {
          error: 'Solo administradores pueden realizar esta accion.',
          caller: {
            id: caller.id,
            email: caller.email,
            profileEmail: callerProfile?.email ?? null,
            role: callerProfile?.role ?? null,
            accessRevoked: callerProfile?.access_revoked ?? null,
          },
        },
        403,
      )
    }

    if (action === 'listProfiles') {
      const { data, error } = await adminClient
        .from('profiles')
        .select(
          'id, name, last_name, nickname, email, identification, phone, area, role, access_revoked, must_change_password, temporary_password_expires_at, created_at',
        )
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      const { data: authUsersData, error: authUsersError } =
        await adminClient.auth.admin.listUsers({
          page: 1,
          perPage: 1000,
        })

      if (authUsersError) {
        throw authUsersError
      }

      const authEmailById = new Map(
        authUsersData.users.map((authUser) => [authUser.id, authUser.email]),
      )

      const profiles = data ?? []
      const enrichedProfiles = profiles.map((profile) => {
        const profileEmail = profile.email || authEmailById.get(profile.id) || null

        return {
          ...profile,
          email: profileEmail,
        }
      })

      for (const profile of enrichedProfiles) {
        const savedProfile = profiles.find(
          (currentProfile) => currentProfile.id === profile.id,
        )

        if (!savedProfile?.email && profile.email) {
          const { error: syncEmailError } = await adminClient
            .from('profiles')
            .update({ email: profile.email })
            .eq('id', profile.id)

          if (syncEmailError) {
            throw syncEmailError
          }
        }
      }

      return jsonResponse({ profiles: enrichedProfiles })
    }

    if (action === 'createProfile') {
      const { name, last_name, nickname, email, password, identification, phone, role } = payload
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      const normalizedNickname = normalizeNickname(nickname)

      assertRequired(name, 'Nombre')
      assertRequired(last_name, 'Apellido')
      assertRequired(nickname, 'Credencial')
      assertRequired(email, 'Correo')
      assertRequired(password, 'Contraseña')
      assertRequired(identification, 'Cedula')
      assertRequired(role, 'Rol')
      assertRole(role)
      assertIdentification(identification)
      assertPhone(phone)
      assertValidNickname(normalizedNickname)
      await assertNicknameAvailable(adminClient, normalizedNickname)
      await assertNicknameSuffixRules(adminClient, {
        name,
        lastName: last_name,
        nickname: normalizedNickname,
      })

      const { data: authData, error: createError } =
        await adminClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { name, last_name, nickname: normalizedNickname, role },
        })

      if (createError) {
        throw createError
      }

      const { error: profileError } = await adminClient.from('profiles').upsert({
        id: authData.user.id,
        name,
        last_name,
        nickname: normalizedNickname,
        email,
        identification,
        phone,
        area: role,
        role,
        access_revoked: false,
        must_change_password: true,
        temporary_password_expires_at: expiresAt,
      })

      if (profileError) {
        throw profileError
      }

      const fullName = `${name} ${last_name}`.trim()

      const emailResult = await sendEmail({
        to: email,
        subject: `${PLATFORM_TEAM} - Bienvenido a ${PLATFORM_NAME}`,
        html: buildWelcomeEmailHtml({
          name: fullName,
          nickname: normalizedNickname,
          email,
          password,
          expiresAt,
        }),
        text: buildWelcomeEmailText({
          name: fullName,
          nickname: normalizedNickname,
          email,
          password,
          expiresAt,
        }),
      })

      return jsonResponse(
        { profileId: authData.user.id, email: emailResult },
        201,
      )
    }

    if (action === 'changePassword') {
      const { profileId, password } = payload
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

      const { data: profile, error: profileError } = await adminClient
        .from('profiles')
        .select('id, name, email, role')
        .eq('id', profileId)
        .maybeSingle()

      if (profileError || !profile) {
        throw new Error('Perfil no encontrado.')
      }

      if (profile.role === 'admin') {
        return jsonResponse(
          { error: 'No se puede cambiar la contraseña de perfiles administradores desde gestion de perfiles.' },
          409,
        )
      }

      const { error: passwordError } =
        await adminClient.auth.admin.updateUserById(profileId, {
          password,
        })

      if (passwordError) {
        throw passwordError
      }

      const { error: updateProfileError } = await adminClient
        .from('profiles')
        .update({
          must_change_password: true,
          temporary_password_expires_at: expiresAt,
        })
        .eq('id', profileId)

      if (updateProfileError) {
        throw updateProfileError
      }

      const emailResult = await sendEmail({
        to: profile.email,
        subject: `${PLATFORM_TEAM} - Cambio de contraseña`,
        html: buildPasswordChangedEmailHtml({
          name: profile.name,
          password,
          expiresAt,
        }),
        text: buildPasswordChangedEmailText({
          name: profile.name,
          password,
          expiresAt,
        }),
      })

      return jsonResponse({ expiresAt, email: emailResult })
    }

    if (action === 'updateProfile') {
      const { profileId, name, last_name, nickname, email, identification, phone, role } = payload
      const normalizedNickname = normalizeNickname(nickname)

      assertRequired(name, 'Nombre')
      assertRequired(last_name, 'Apellido')
      assertRequired(nickname, 'Credencial')
      assertRequired(email, 'Correo')
      assertRequired(identification, 'Cedula')
      assertRequired(role, 'Rol')
      assertRole(role)
      assertIdentification(identification)
      assertPhone(phone)
      assertValidNickname(normalizedNickname)
      await assertNicknameAvailable(adminClient, normalizedNickname, profileId)
      await assertNicknameSuffixRules(adminClient, {
        name,
        lastName: last_name,
        nickname: normalizedNickname,
        excludeProfileId: profileId,
      })

      const { data: profile, error: profileError } = await adminClient
        .from('profiles')
        .select('id, email, role')
        .eq('id', profileId)
        .maybeSingle()

      if (profileError || !profile) {
        throw new Error('Perfil no encontrado.')
      }

      if (profile.role === 'admin') {
        return jsonResponse(
          { error: 'No se puede editar perfiles administradores desde gestion de perfiles.' },
          409,
        )
      }

      const { error: updateProfileError } = await adminClient
        .from('profiles')
        .update({
          name,
          last_name,
          nickname: normalizedNickname,
          email,
          identification,
          phone,
          role,
          area: role,
        })
        .eq('id', profileId)

      if (updateProfileError) {
        throw updateProfileError
      }

      const { error: updateUserError } =
        await adminClient.auth.admin.updateUserById(profileId, {
          email,
          email_confirm: true,
          user_metadata: { name, last_name, nickname: normalizedNickname, role },
        })

      if (updateUserError) {
        throw updateUserError
      }

      return jsonResponse({ updated: true })
    }

    if (action === 'revokeAccess') {
      const { profileId } = payload

      const { data: profile, error: profileError } = await adminClient
        .from('profiles')
        .select('role')
        .eq('id', profileId)
        .maybeSingle()

      if (profileError || !profile) {
        throw new Error('Perfil no encontrado.')
      }

      if (profile.role === 'admin') {
        return jsonResponse(
          { error: 'No se puede revocar acceso a perfiles administradores.' },
          409,
        )
      }

      const { error: updateError } = await adminClient
        .from('profiles')
        .update({ access_revoked: true })
        .eq('id', profileId)

      if (updateError) {
        throw updateError
      }

      await adminClient.auth.admin.updateUserById(profileId, {
        ban_duration: '876000h',
      })

      return jsonResponse({ revoked: true })
    }

    if (action === 'reactivateAccess') {
      const { profileId } = payload

      const { data: profile, error: profileError } = await adminClient
        .from('profiles')
        .select('access_revoked')
        .eq('id', profileId)
        .maybeSingle()

      if (profileError || !profile) {
        throw new Error('Perfil no encontrado.')
      }

      if (!profile.access_revoked) {
        return jsonResponse(
          { error: 'El perfil ya se encuentra activo.' },
          409,
        )
      }

      const { error: updateError } = await adminClient
        .from('profiles')
        .update({ access_revoked: false })
        .eq('id', profileId)

      if (updateError) {
        throw updateError
      }

      const { error: reactivateUserError } =
        await adminClient.auth.admin.updateUserById(profileId, {
          ban_duration: 'none',
        })

      if (reactivateUserError) {
        throw reactivateUserError
      }

      return jsonResponse({ reactivated: true })
    }

    if (action === 'deleteRevokedProfile') {
      const { profileId } = payload

      const { data: profile, error: profileError } = await adminClient
        .from('profiles')
        .select('role, access_revoked')
        .eq('id', profileId)
        .maybeSingle()

      if (profileError || !profile) {
        throw new Error('Perfil no encontrado.')
      }

      if (profile.role === 'admin') {
        return jsonResponse(
          { error: 'No se puede eliminar perfiles administradores.' },
          409,
        )
      }

      if (!profile.access_revoked) {
        return jsonResponse(
          { error: 'Solo se pueden eliminar perfiles con acceso revocado.' },
          409,
        )
      }

      const { error: deleteError } =
        await adminClient.auth.admin.deleteUser(profileId)

      if (deleteError) {
        throw deleteError
      }

      return jsonResponse({ deleted: true })
    }

    return jsonResponse({ error: 'Accion no soportada.' }, 400)
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Error inesperado.' },
      400,
    )
  }
})
