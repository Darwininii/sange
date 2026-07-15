import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import DashboardLayout from '../components/layout/DashboardLayout'
import Loader from '../hooks/Loader'
import appToast from '../hooks/appToast'
import PageHeader from '../hooks/PageHeader'
import CustomBadge from '../shared/CustomBadge'
import AppDialog from '../shared/dialog'
import Pagination from '../shared/Pagination'
import AppButton from '../shared/AppButton'
import InputProfile from '../shared/InputProfile'
import ProfileActions from '../shared/ProfileActions'
import YesONo from '../shared/YesONo'
import { INITIAL_PROFILE_VALUES } from '../shared/profileConstants'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../shared/table'
import { usePagination } from '../hooks/usePagination'
import { useCachedData } from '../hooks/useCachedData'
import {
  changeProfilePassword,
  createProfile,
  deleteRevokedProfile,
  getProfiles,
  reactivateProfileAccess,
  revokeProfileAccess,
  updateProfile,
} from '../services/profileService'
import { useAuthStore } from '../store/authStore'
import { invalidateUserCacheByPrefix } from '../store/dataCacheStore'
import { signOutUser } from '../utils/auth'
import {
  buildFullNickname,
  buildNicknameBase,
  getNicknameValidationError,
  parseNicknameSuffix,
} from '../utils/nickname'

const roleLabels = {
  admin: 'Administrador',
  cashier: 'Cajero',
  technician: 'Tecnico',
}

function buildEmailStatusMessage(email) {
  if (email?.sent) {
    return 'Correo enviado correctamente.'
  }

  if (email?.reason === 'Email provider not configured') {
    return 'Configura GMAIL_USER y GMAIL_APP_PASSWORD para enviar correo.'
  }

  if (email?.reason) {
    return `No se pudo enviar el correo: ${email.reason}`
  }

  return 'No se pudo enviar el correo.'
}

function formatProfileName(profile) {
  return [profile?.name, profile?.last_name].filter(Boolean).join(' ').trim() || 'Usuario'
}

function isValidPhone(value) {
  return !value.trim() || value.trim().length >= 10
}

function isValidIdentification(value) {
  return value.trim().length >= 8
}

function hasRequiredCreateFields(form) {
  return Boolean(
    form.name.trim() &&
      form.last_name.trim() &&
      form.email.trim() &&
      form.password.trim() &&
      form.identification.trim() &&
      form.role,
  )
}

function hasRequiredEditFields(form) {
  return Boolean(
    form.name.trim() &&
      form.last_name.trim() &&
      form.email.trim() &&
      form.identification.trim() &&
      form.role,
  )
}

function getErrorMessage(error, fallback) {
  return error instanceof Error ? error.message : fallback
}

function getEditFormValues(profile) {
  return {
    name: profile?.name ?? '',
    last_name: profile?.last_name ?? '',
    email: profile?.email ?? '',
    identification: profile?.identification ?? '',
    phone: profile?.phone ?? '',
    role: profile?.role ?? 'technician',
  }
}

function DashboardProfilesPage() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const [profileForm, setProfileForm] = useState(INITIAL_PROFILE_VALUES)
  const [passwordForm, setPasswordForm] = useState('')
  const [passwordProfile, setPasswordProfile] = useState(null)
  const [editProfile, setEditProfile] = useState(null)
  const [reactivateProfile, setReactivateProfile] = useState(null)
  const [revokeProfile, setRevokeProfile] = useState(null)
  const [deleteProfile, setDeleteProfile] = useState(null)
  const [createNicknameSuffix, setCreateNicknameSuffix] = useState('')
  const [editNicknameSuffix, setEditNicknameSuffix] = useState('')
  const [editForm, setEditForm] = useState(getEditFormValues())
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    data: profilesData,
    isLoading,
    error,
    refetch: refetchProfiles,
  } = useCachedData({
    cacheKey: 'profiles',
    fetcher: getProfiles,
    enabled: Boolean(user?.id),
  })
  const profiles = Array.isArray(profilesData) ? profilesData : []

  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    paginate,
  } = usePagination({ totalItems: profiles.length, storageKey: 'profiles' })

  const visibleProfiles = paginate(profiles)

  useEffect(() => {
    if (!error) {
      return
    }

    appToast.danger(getErrorMessage(error, 'No se pudieron cargar los perfiles.'))
  }, [error])

  function handleFormFieldChange(setter) {
    return (event) => {
      const { name, value } = event.target
      setter((currentForm) => ({ ...currentForm, [name]: value }))
    }
  }

  function handleFormRoleChange(setter) {
    return (value) => {
      setter((currentForm) => ({ ...currentForm, role: value }))
    }
  }

  async function refreshProfiles() {
    try {
      if (user?.id) {
        invalidateUserCacheByPrefix(user.id, 'activity-data')
      }

      await refetchProfiles({ silent: true, force: true })
    } catch (profileError) {
      appToast.danger(
        getErrorMessage(profileError, 'No se pudieron cargar los perfiles.'),
      )
    }
  }

  async function handleLogout() {
    await signOutUser()
    logout()
    navigate({ to: '/' })
  }

  function closeSecondaryDialogs() {
    setEditProfile(null)
    setPasswordProfile(null)
    setPasswordForm('')
    setReactivateProfile(null)
    setRevokeProfile(null)
    setDeleteProfile(null)
  }

  function openEditDialog(profile) {
    const base = buildNicknameBase(profile.name, profile.last_name)

    closeSecondaryDialogs()
    setEditProfile(profile)
    setEditNicknameSuffix(parseNicknameSuffix(profile.nickname, base))
    setEditForm(getEditFormValues(profile))
  }

  function openPasswordDialog(profile) {
    closeSecondaryDialogs()
    setPasswordProfile(profile)
    setPasswordForm('')
  }

  function openReactivateDialog(profile) {
    closeSecondaryDialogs()
    setReactivateProfile(profile)
  }

  function openRevokeDialog(profile) {
    closeSecondaryDialogs()
    setRevokeProfile(profile)
  }

  function openDeleteDialog(profile) {
    closeSecondaryDialogs()
    setDeleteProfile(profile)
  }

  const profileActionHandlers = {
    onEdit: openEditDialog,
    onChangePassword: openPasswordDialog,
    onReactivate: openReactivateDialog,
    onRevoke: openRevokeDialog,
    onDelete: openDeleteDialog,
  }

  async function handleCreateProfile(event) {
    event.preventDefault()

    if (!hasRequiredCreateFields(profileForm)) {
      appToast.warning('Nombre, apellido, correo, contraseña, cedula y rol son obligatorios.')
      return
    }

    if (!isValidIdentification(profileForm.identification)) {
      appToast.warning('La cedula debe tener al menos 8 caracteres.')
      return
    }

    if (!isValidPhone(profileForm.phone)) {
      appToast.warning('Si ingresas numero celular, debe tener al menos 10 caracteres.')
      return
    }

    const nicknameError = getNicknameValidationError({
      name: profileForm.name,
      lastName: profileForm.last_name,
      suffix: createNicknameSuffix,
      profiles,
    })

    if (nicknameError) {
      appToast.warning(nicknameError)
      return
    }

    const nickname = buildFullNickname(
      buildNicknameBase(profileForm.name, profileForm.last_name),
      createNicknameSuffix,
    )

    setIsSubmitting(true)

    try {
      await appToast.promise(createProfile({ ...profileForm, nickname }), {
        loading: 'Creando perfil...',
        success: (result) =>
          `Perfil creado correctamente. ${buildEmailStatusMessage(result.email)}`,
        error: (profileError) =>
          getErrorMessage(profileError, 'No se pudo crear el perfil.'),
      })
      setProfileForm(INITIAL_PROFILE_VALUES)
      setCreateNicknameSuffix('')
      setIsCreateDialogOpen(false)
      await refreshProfiles()
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleUpdateProfile(event) {
    event.preventDefault()

    if (!editProfile) {
      return
    }

    if (!hasRequiredEditFields(editForm)) {
      appToast.warning('Nombre, apellido, correo, cedula y rol son obligatorios.')
      return
    }

    if (!isValidIdentification(editForm.identification)) {
      appToast.warning('La cedula debe tener al menos 8 caracteres.')
      return
    }

    if (!isValidPhone(editForm.phone)) {
      appToast.warning('Si ingresas numero celular, debe tener al menos 10 caracteres.')
      return
    }

    const nicknameError = getNicknameValidationError({
      name: editForm.name,
      lastName: editForm.last_name,
      suffix: editNicknameSuffix,
      profiles,
      excludeProfileId: editProfile.id,
    })

    if (nicknameError) {
      appToast.warning(nicknameError)
      return
    }

    const nickname = buildFullNickname(
      buildNicknameBase(editForm.name, editForm.last_name),
      editNicknameSuffix,
    )

    setIsSubmitting(true)

    try {
      await appToast.promise(updateProfile(editProfile.id, { ...editForm, nickname }), {
        loading: 'Actualizando perfil...',
        success: 'Perfil actualizado correctamente.',
        error: (profileError) =>
          getErrorMessage(profileError, 'No se pudo actualizar el perfil.'),
      })
      setEditProfile(null)
      await refreshProfiles()
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleChangePassword(event) {
    event.preventDefault()

    if (!passwordForm || !passwordProfile) {
      appToast.warning('Ingresa una contraseña preventiva.')
      return
    }

    setIsSubmitting(true)

    try {
      await appToast.promise(changeProfilePassword(passwordProfile.id, passwordForm), {
        loading: 'Actualizando contraseña...',
        success: (result) =>
          `Contraseña actualizada correctamente. ${buildEmailStatusMessage(result.email)}`,
        error: (profileError) =>
          getErrorMessage(profileError, 'No se pudo cambiar la contraseña.'),
      })
      setPasswordForm('')
      setPasswordProfile(null)
      await refreshProfiles()
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleRevokeAccess() {
    if (!revokeProfile) {
      return
    }

    if (revokeProfile.role === 'admin') {
      appToast.warning('No se puede revocar permisos a perfiles administradores.')
      return
    }

    setIsSubmitting(true)

    try {
      await appToast.promise(revokeProfileAccess(revokeProfile.id), {
        loading: 'Revocando permisos...',
        success: 'Permisos revocados correctamente.',
        error: (profileError) =>
          getErrorMessage(profileError, 'No se pudieron revocar los permisos.'),
      })
      setRevokeProfile(null)
      await refreshProfiles()
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleReactivateAccess() {
    if (!reactivateProfile) {
      return
    }

    setIsSubmitting(true)

    try {
      await appToast.promise(reactivateProfileAccess(reactivateProfile.id), {
        loading: 'Activando permisos...',
        success: 'Permisos activados correctamente.',
        error: (profileError) =>
          getErrorMessage(profileError, 'No se pudieron activar los permisos.'),
      })
      setReactivateProfile(null)
      await refreshProfiles()
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDeleteRevokedProfile() {
    if (!deleteProfile) {
      return
    }

    if (!deleteProfile.access_revoked) {
      appToast.warning('Solo se pueden eliminar perfiles revocados.')
      return
    }

    setIsSubmitting(true)

    try {
      await appToast.promise(deleteRevokedProfile(deleteProfile.id), {
        loading: 'Eliminando perfil...',
        success: 'Perfil revocado eliminado correctamente.',
        error: (profileError) =>
          getErrorMessage(profileError, 'No se pudo eliminar el perfil.'),
      })
      setDeleteProfile(null)
      await refreshProfiles()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <DashboardLayout user={user} onLogout={handleLogout}>
      <div className="mx-auto max-w-7xl">
        <PageHeader title="Gestion de perfiles" />

        <section className="mt-8 rounded-4xl bg-surface p-6 shadow-sm ring-1 ring-border">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-2xl font-semibold text-foreground">
                Perfiles registrados
              </h3>
              <p className="mt-1 text-sm text-foreground/55">
                Las contraseñas no son visibles. Solo puedes reemplazarlas.
              </p>
            </div>
            <AppButton
              effect="zoomIn"
              className="bg-[#1a2340] font-black text-white hover:bg-gray-950 dark:bg-primary/90 dark:text-black"
              onClick={() => setIsCreateDialogOpen(true)}
            >
              Crear perfil
            </AppButton>
          </div>

          <div className="mt-6">
            {isLoading ? (
              <div className="flex justify-center rounded-3xl bg-background px-5 py-8">
                <Loader
                  label="Cargando perfiles..."
                  className="text-foreground/55 [&>svg]:text-black/70 dark:[&>svg]:text-white/70"
                />
              </div>
            ) : (
              <Table
                footer={
                  profiles.length > 0 ? (
                    <Pagination
                      page={page}
                      totalPages={totalPages}
                      onPageChange={setPage}
                      pageSize={pageSize}
                      onPageSizeChange={setPageSize}
                    />
                  ) : null
                }
              >
                <TableHeader>
                  <TableRow className="hover:bg-background">
                    <TableHead>Usuario</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleProfiles.map((profile) => (
                    <TableRow key={profile.id}>
                      <TableCell>
                        <div>
                          <p className="font-bold text-foreground">
                            {formatProfileName(profile)}
                          </p>
                          <p className="text-sm text-foreground/55">
                            {profile.email}
                          </p>
                          <p className="text-xs text-foreground/45">
                            Credencial: {profile.nickname || 'Sin credencial'}
                          </p>
                          <p className="text-xs text-foreground/45">
                            Cedula: {profile.identification || 'Sin cedula'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <CustomBadge
                          color="blue"
                          label={roleLabels[profile.role] ?? profile.role}
                        />
                      </TableCell>
                      <TableCell>
                        <CustomBadge
                          color={profile.access_revoked ? 'red' : 'green'}
                          label={profile.access_revoked ? 'Revocado' : 'Activo'}
                        />
                      </TableCell>
                      <TableCell>
                        <ProfileActions
                          profile={profile}
                          isSubmitting={isSubmitting}
                          className="justify-end"
                          {...profileActionHandlers}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </section>

        <AppDialog
          open={isCreateDialogOpen}
          title="Crear perfil"
          onOpenChange={(open) => {
            setIsCreateDialogOpen(open)

            if (!open) {
              setCreateNicknameSuffix('')
            }
          }}
        >
          <InputProfile
            mode="create"
            values={profileForm}
            nicknameSuffix={createNicknameSuffix}
            onNicknameSuffixChange={setCreateNicknameSuffix}
            profiles={profiles}
            isSubmitting={isSubmitting}
            onChange={handleFormFieldChange(setProfileForm)}
            onRoleChange={handleFormRoleChange(setProfileForm)}
            onSubmit={handleCreateProfile}
            submitLabel="Crear perfil"
          />
        </AppDialog>

        <AppDialog
          open={Boolean(passwordProfile)}
          title={`Cambiar contraseña de ${formatProfileName(passwordProfile)}`}
          onOpenChange={(open) => {
            if (!open) {
              setPasswordProfile(null)
              setPasswordForm('')
            }
          }}
        >
          <div className="mb-5 border-b border-border pb-5">
            <p className="mb-3 text-sm font-semibold text-black/70 dark:text-white/70">
              ¿Qué quieres hacer?
            </p>
            <ProfileActions
              profile={passwordProfile}
              exclude="password"
              isSubmitting={isSubmitting}
              {...profileActionHandlers}
            />
          </div>
          <InputProfile
            mode="password"
            values={{ password: passwordForm }}
            isSubmitting={isSubmitting}
            onChange={(event) => setPasswordForm(event.target.value)}
            onSubmit={handleChangePassword}
            submitLabel="Cambiar contraseña"
          />
        </AppDialog>

        <AppDialog
          open={Boolean(editProfile)}
          title={`Editar perfil de ${formatProfileName(editProfile)}`}
          onOpenChange={(open) => {
            if (!open) {
              setEditProfile(null)
            }
          }}
        >
          <div className="mb-5 border-b border-border pb-5">
            <p className="mb-3 text-sm font-semibold text-black/70 dark:text-white/70">
              ¿Qué quieres hacer?
            </p>
            <ProfileActions
              profile={editProfile}
              exclude="edit"
              isSubmitting={isSubmitting}
              {...profileActionHandlers}
            />
          </div>
          <InputProfile
            mode="edit"
            values={editForm}
            nicknameSuffix={editNicknameSuffix}
            onNicknameSuffixChange={setEditNicknameSuffix}
            profiles={profiles}
            excludeProfileId={editProfile?.id}
            isSubmitting={isSubmitting}
            onChange={handleFormFieldChange(setEditForm)}
            onRoleChange={handleFormRoleChange(setEditForm)}
            onSubmit={handleUpdateProfile}
            submitLabel="Guardar cambios"
          />
        </AppDialog>

        <YesONo
          open={Boolean(reactivateProfile)}
          title="Activar permisos"
          isSubmitting={isSubmitting}
          description={`El usuario ${formatProfileName(reactivateProfile)} volverá a estar activo.`}
          onConfirm={handleReactivateAccess}
          onOpenChange={(open) => {
            if (!open) {
              setReactivateProfile(null)
            }
          }}
        />

        <YesONo
          open={Boolean(revokeProfile)}
          title="Revocar permisos"
          isSubmitting={isSubmitting}
          description={`El usuario ${formatProfileName(revokeProfile)} perderá el acceso a la plataforma.`}
          onConfirm={handleRevokeAccess}
          onOpenChange={(open) => {
            if (!open) {
              setRevokeProfile(null)
            }
          }}
        />

        <YesONo
          open={Boolean(deleteProfile)}
          title="Eliminar perfil"
          isSubmitting={isSubmitting}
          description={`El perfil de ${formatProfileName(deleteProfile)} se eliminará de forma permanente y no podrá recuperarse.`}
          onConfirm={handleDeleteRevokedProfile}
          onOpenChange={(open) => {
            if (!open) {
              setDeleteProfile(null)
            }
          }}
        />
      </div>
    </DashboardLayout>
  )
}

export default DashboardProfilesPage
