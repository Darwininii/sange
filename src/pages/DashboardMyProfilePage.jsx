import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { TbPhone, TbPhonePlus, TbUserKey } from 'react-icons/tb'
import DashboardLayout from '../components/layout/DashboardLayout'
import Loader from '../hooks/Loader'
import appToast from '../hooks/appToast'
import { useCachedData } from '../hooks/useCachedData'
import PageHeader from '../hooks/PageHeader'
import AppDialog from '../shared/dialog'
import InputProfile from '../shared/InputProfile'
import ProfileActionButton from '../shared/ProfileActionButton'
import {
  changeMyPassword,
  getMyProfile,
  updateMyProfile,
} from '../services/profileService'
import { useAuthStore } from '../store/authStore'
import { signOutUser } from '../utils/auth'

const initialPasswordForm = {
  password: '',
  confirmPassword: '',
}

function getErrorMessage(error, fallback) {
  return error instanceof Error ? error.message : fallback
}

function isValidPhone(value) {
  return value.trim().length >= 10
}

function LockedField({ label, value }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-bold text-foreground/85">{label}</span>
      <input
        className="cursor-not-allowed rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-foreground/70 outline-none ring-2 ring-red-400/20"
        value={value ?? ''}
        readOnly
      />
    </label>
  )
}

function ActionField({ label, value, placeholder, icon, tooltip, tone = 'blue', onClick }) {
  return (
    <div className="grid gap-2">
      <span className="text-sm font-bold text-foreground/85">{label}</span>
      <div className="flex items-center gap-3">
        <input
          className="min-w-0 flex-1 rounded-2xl border border-border bg-background px-4 py-3 text-foreground/85 outline-none"
          value={value || placeholder}
          readOnly
        />
        <ProfileActionButton
          icon={icon}
          label={tooltip ?? label}
          tooltip={tooltip ?? label}
          tone={tone}
          onClick={onClick}
        />
      </div>
    </div>
  )
}

function DashboardMyProfilePage() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const updateUser = useAuthStore((state) => state.updateUser)
  const [phone, setPhone] = useState('')
  const [passwordForm, setPasswordForm] = useState(initialPasswordForm)
  const [isPhoneDialogOpen, setIsPhoneDialogOpen] = useState(false)
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    data: profile,
    isLoading,
    error,
    refetch: refetchProfile,
    invalidate: invalidateProfileCache,
  } = useCachedData({
    cacheKey: 'my-profile',
    fetcher: getMyProfile,
    enabled: Boolean(user?.id),
  })

  useEffect(() => {
    if (!profile) {
      return
    }

    updateUser({
      name: profile.name ?? user.name,
      lastName: profile.last_name ?? '',
      nickname: profile.nickname ?? '',
      email: profile.email ?? user.email,
      identification: profile.identification ?? '',
      phone: profile.phone ?? '',
      mustChangePassword: Boolean(profile.must_change_password),
    })
  }, [profile, updateUser, user.email, user.name])

  useEffect(() => {
    if (!error) {
      return
    }

    appToast.danger(getErrorMessage(error, 'No se pudo cargar tu perfil.'))
  }, [error])

  async function handleLogout() {
    await signOutUser()
    logout()
    navigate({ to: '/' })
  }

  function handlePasswordFormChange(event) {
    const { name, value } = event.target
    setPasswordForm((currentForm) => ({ ...currentForm, [name]: value }))
  }

  function handlePhoneChange(event) {
    setPhone(event.target.value)
  }

  async function handleUpdatePhone(event) {
    event.preventDefault()

    if (!isValidPhone(phone)) {
      appToast.warning('El número de celular debe tener al menos 10 caracteres.')
      return
    }

    setIsSubmitting(true)

    try {
      await appToast.promise(updateMyProfile({ phone }), {
        loading: 'Actualizando número...',
        success: 'Número de celular actualizado correctamente.',
        error: (profileError) =>
          getErrorMessage(profileError, 'No se pudo actualizar tu número de celular.'),
      })
      updateUser({ phone })
      setIsPhoneDialogOpen(false)
      invalidateProfileCache()
      await refetchProfile({ silent: true, force: true })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleChangePassword(event) {
    event.preventDefault()

    if (passwordForm.password.length < 6) {
      appToast.warning('La nueva contraseña debe tener al menos 6 caracteres.')
      return
    }

    if (passwordForm.password !== passwordForm.confirmPassword) {
      appToast.warning('La confirmacion de contraseña no coincide.')
      return
    }

    setIsSubmitting(true)

    try {
      await appToast.promise(
        changeMyPassword({
          password: passwordForm.password,
        }),
        {
          loading: 'Actualizando contraseña...',
          success: 'Contraseña actualizada correctamente.',
          error: (profileError) =>
            getErrorMessage(profileError, 'No se pudo cambiar tu contraseña.'),
        },
      )
      setPasswordForm(initialPasswordForm)
      setIsPasswordDialogOpen(false)
      updateUser({ mustChangePassword: false })
      try {
        window.sessionStorage.removeItem(`sange:temp-password-notice:${user.id}`)
      } catch {
        // Ignore storage errors.
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <DashboardLayout user={user} onLogout={handleLogout}>
      <div className="mx-auto max-w-5xl">
        <PageHeader title="Mi perfil" />

        {user.mustChangePassword && (
          <p className="mt-6 rounded-3xl bg-amber-500/10 px-5 py-4 text-sm font-semibold text-amber-200">
            Tu contraseña temporal vence en 24 horas. Cambiala lo antes posible para
            mantener el acceso a la plataforma.
          </p>
        )}

        {isLoading ? (
          <div className="mt-8 flex justify-center rounded-4xl bg-surface p-8 shadow-sm ring-1 ring-border">
            <Loader label="Cargando perfil..." />
          </div>
        ) : (
          <>
            <section className="mt-8 rounded-4xl bg-surface p-6 shadow-sm ring-1 ring-border xl:mx-auto xl:max-w-2xl">
              <h3 className="font-display text-2xl font-semibold text-foreground">
                Datos personales
              </h3>
              <p className="mt-1 text-sm text-foreground/55">
                Los datos bloqueados requerirán solicitud de actualización más adelante.
              </p>

              <div className="mt-6 grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <LockedField label="Nombre" value={profile?.name} />
                  <LockedField label="Apellido" value={profile?.last_name} />
                </div>
                <LockedField
                  label="Credencial de acceso"
                  value={profile?.nickname}
                />
                <LockedField label="Cedula" value={profile?.identification} />
                <LockedField label="Correo" value={profile?.email} />
                <ActionField
                  label="Numero celular"
                  value={profile?.phone}
                  placeholder="Sin numero registrado"
                  icon={profile?.phone ? TbPhone : TbPhonePlus}
                  tooltip={
                    profile?.phone
                      ? 'Actualizar número celular'
                      : 'Agregar número celular'
                  }
                  onClick={() => {
                    setPhone(profile?.phone ?? '')
                    setIsPhoneDialogOpen(true)
                  }}
                />
                <ActionField
                  label="Contraseña"
                  value="********"
                  icon={TbUserKey}
                  tooltip="Cambiar contraseña"
                  onClick={() => {
                    setPasswordForm(initialPasswordForm)
                    setIsPasswordDialogOpen(true)
                  }}
                />
              </div>
            </section>

            <AppDialog
              open={isPhoneDialogOpen}
              title="Actualizar número de celular"
              onOpenChange={setIsPhoneDialogOpen}
            >
              <InputProfile
                mode="phone"
                values={{ phone }}
                isSubmitting={isSubmitting}
                onChange={handlePhoneChange}
                onSubmit={handleUpdatePhone}
                submitLabel="Guardar cambios"
              />
            </AppDialog>

            <AppDialog
              open={isPasswordDialogOpen}
              title="Cambiar contraseña"
              onOpenChange={setIsPasswordDialogOpen}
            >
              <InputProfile
                mode="password"
                requireConfirm
                values={passwordForm}
                isSubmitting={isSubmitting}
                onChange={handlePasswordFormChange}
                onSubmit={handleChangePassword}
                passwordDescription="Define una nueva contraseña personal y confirma que coincida."
                submitLabel="Guardar contraseña"
              />
            </AppDialog>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}

export default DashboardMyProfilePage
