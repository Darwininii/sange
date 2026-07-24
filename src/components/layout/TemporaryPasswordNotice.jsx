import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import AppDialog from '@/shared/dialog'
import AppButton from '@/shared/AppButton'

function getNoticeStorageKey(userId) {
  return `sange:temp-password-notice:${userId}`
}

function readDismissed(userId) {
  if (!userId || typeof window === 'undefined') {
    return false
  }

  try {
    return window.sessionStorage.getItem(getNoticeStorageKey(userId)) === '1'
  } catch {
    return false
  }
}

function TemporaryPasswordNotice({ user }) {
  const userId = user?.id ?? null
  const mustChangePassword = Boolean(user?.mustChangePassword)
  const [dismissed, setDismissed] = useState(() => readDismissed(userId))
  const [activeUserId, setActiveUserId] = useState(userId)

  if (activeUserId !== userId) {
    setActiveUserId(userId)
    setDismissed(readDismissed(userId))
  }

  const isOpen = Boolean(userId) && mustChangePassword && !dismissed

  function handleAccept() {
    if (userId) {
      try {
        window.sessionStorage.setItem(getNoticeStorageKey(userId), '1')
      } catch {
        // Ignore storage errors.
      }
    }

    setDismissed(true)
  }

  if (!mustChangePassword) {
    return null
  }

  return (
    <AppDialog
      open={isOpen}
      title="Cambia tu contraseña"
      hideCloseButton
      onOpenChange={(open) => {
        if (!open) {
          handleAccept()
        }
      }}
    >
      <div className="mt-5 grid gap-5">
        <div className="rounded-3xl bg-amber-500/10 px-5 py-4 text-sm leading-6 text-black">
          <p className="font-bold">
            Debes cambiar tu contraseña para mayor seguridad.
          </p>
          <p className="mt-2">
            Si no la cambias, esta contraseña temporal quedara obsoleta en 24 horas
            y no podras volver a ingresar hasta que un administrador te asigne una nueva.
          </p>
        </div>

        <p className="text-sm text-foreground/70">
          Puedes hacerlo cuando quieras desde{' '}
          <Link
            to="/dashboard/mi-perfil"
            className="font-semibold text-primary underline-offset-2 hover:underline"
            onClick={handleAccept}
          >
            Mi perfil
          </Link>
          .
        </p>

        <div className="flex justify-end">
          <AppButton effect="zoomIn" onClick={handleAccept}>
            Aceptar
          </AppButton>
        </div>
      </div>
    </AppDialog>
  )
}

export default TemporaryPasswordNotice
