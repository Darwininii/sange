import { cn } from '@/lib/utils'
import {
  buildFullNickname,
  buildNicknameBase,
  isNicknameSuffixRequired,
  isNicknameTaken,
} from '@/utils/nickname'

function RequiredLabel({ children }) {
  return (
    <span className="mb-1 flex items-center gap-1 text-sm font-bold text-foreground/85">
      {children}
      <span className="size-2.5 text-red-400" aria-hidden="true">
        *
      </span>
    </span>
  )
}

function NicknameField({
  name,
  lastName,
  suffix,
  profiles,
  excludeProfileId = null,
  onSuffixChange,
}) {
  const base = buildNicknameBase(name, lastName)
  const fullNickname = buildFullNickname(base, suffix)
  const suffixRequired = isNicknameSuffixRequired(profiles, name, lastName, excludeProfileId)
  const nicknameTaken = Boolean(base) && isNicknameTaken(profiles, fullNickname, excludeProfileId)

  function handleSuffixInputChange(event) {
    onSuffixChange(event.target.value.replace(/\D/g, '').slice(0, 4))
  }

  return (
    <div className="grid gap-2">
      <RequiredLabel>Credencial de acceso</RequiredLabel>
      <div className="flex flex-wrap items-center gap-2">
        <input
          className="min-w-0 flex-1 cursor-not-allowed rounded-2xl border border-border bg-white dark:bg-transparent/30 dark:text-white px-4 py-3 text-foreground/70 outline-none"
          value={base || 'nombre-apellido'}
          readOnly
          aria-label="Base de credencial"
        />
        <input
          className="sange-input w-24 text-center bg-white text-bold dark:bg-transparent/30 dark:text-white"
          value={suffix}
          placeholder="00"
          inputMode="numeric"
          pattern="[0-9]*"
          aria-label="Numeracion de credencial"
          onChange={handleSuffixInputChange}
        />
      </div>

      {nicknameTaken ? (
        <p className="text-xs font-bold text-red-700 underline decoration-red-600 dark:text-white">
          Esta credencial ya esta en uso.
        </p>
      ) : null}

      {suffixRequired && !suffix ? (
        <p className={cn('text-xs font-bold text-green-800 underline decoration-green-600 dark:text-white')}>
          Ya existe un usuario con el mismo nombre y apellido. Agrega numeracion para guardar.
        </p>
      ) : null}
    </div>
  )
}

export default NicknameField
