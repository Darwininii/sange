import { TbUserEdit, TbUserKey, TbUserX, TbTrashX, TbUserCheck } from 'react-icons/tb'
import ProfileActionButton from '@/shared/ProfileActionButton'
import { cn } from '@/lib/utils'

/**
 * Acciones de perfil compartidas (tabla + dialogs).
 */
function ProfileActions({
  profile,
  exclude,
  isSubmitting = false,
  className,
  onEdit,
  onChangePassword,
  onReactivate,
  onRevoke,
  onDelete,
}) {
  if (!profile) {
    return null
  }

  const isAdmin = profile.role === 'admin'
  const isRevoked = Boolean(profile.access_revoked)

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {exclude !== 'edit' && !isAdmin ? (
        <ProfileActionButton
          icon={TbUserEdit}
          label="Editar perfil"
          tooltip="Editar perfil"
          onClick={() => onEdit?.(profile)}
        />
      ) : null}

      {exclude !== 'password' && !isAdmin ? (
        <ProfileActionButton
          icon={TbUserKey}
          label="Cambiar contraseña"
          tooltip="Cambiar contraseña"
          tone="default"
          disabled={isSubmitting}
          onClick={() => onChangePassword?.(profile)}
        />
      ) : null}

      {isRevoked ? (
        <ProfileActionButton
          icon={TbUserCheck}
          label="Activar permisos"
          tooltip="Activar permisos"
          tone="emerald"
          disabled={isSubmitting}
          onClick={() => onReactivate?.(profile)}
        />
      ) : !isAdmin ? (
        <ProfileActionButton
          icon={TbUserX}
          label="Revocar permisos"
          tooltip="Revocar permisos"
          tone="red"
          disabled={isSubmitting}
          onClick={() => onRevoke?.(profile)}
        />
      ) : null}

      {isRevoked ? (
        <ProfileActionButton
          icon={TbTrashX}
          label="Eliminar perfil revocado"
          tooltip="Eliminar perfil"
          tone="red"
          disabled={isSubmitting || isAdmin}
          onClick={() => onDelete?.(profile)}
        />
      ) : null}
    </div>
  )
}

export default ProfileActions
