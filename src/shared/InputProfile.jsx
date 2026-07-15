import { FaAsterisk } from 'react-icons/fa'
import AppButton from '@/shared/AppButton'
import NicknameField from '@/shared/NicknameField'
import PasswordInput from '@/shared/password-input'
import AppSelect from '@/shared/select'
import { cn } from '@/lib/utils'
import { PROFILE_ROLE_OPTIONS } from '@/shared/profileConstants'

const FIELD_CLASS =
  'w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none focus:border-primary focus:bg-white dark:focus:bg-transparent/10 focus:ring-4 focus:ring-primary/20'

function RequiredLabel({ children }) {
  return (
    <span className="mb-1 flex items-center gap-1 text-sm font-bold text-foreground/85">
      {children}
      <FaAsterisk className="size-2.5 text-red-500" />
    </span>
  )
}

function FieldLabel({ children, required = false }) {
  if (required) {
    return <RequiredLabel>{children}</RequiredLabel>
  }

  return (
    <span className="mb-1 block text-sm font-bold text-foreground/85">
      {children}
    </span>
  )
}

/**
 * Formulario reutilizable de perfiles.
 *
 * @param {'create' | 'edit' | 'password' | 'phone'} mode
 */
function InputProfile({
  mode = 'create',
  values,
  nicknameSuffix = '',
  onNicknameSuffixChange,
  profiles = [],
  excludeProfileId = null,
  isSubmitting = false,
  onChange,
  onRoleChange,
  onSubmit,
  submitLabel,
  requireConfirm = false,
  passwordDescription =
    'La nueva contraseña preventiva se enviara al correo registrado y tendra 24 horas antes de expirar.',
  passwordPlaceholder = 'Nueva contraseña preventiva',
  phoneDescription =
    'Ingresa tu número de celular actualizado para mantener tus datos al día.',
  className,
}) {
  const isPasswordMode = mode === 'password'
  const isPhoneMode = mode === 'phone'
  const password = values?.password ?? ''
  const confirmPassword = values?.confirmPassword ?? ''
  const hasPasswordConfirmation = requireConfirm && confirmPassword.length > 0
  const passwordsMatch =
    hasPasswordConfirmation && password === confirmPassword
  const canSubmitPassword =
    !requireConfirm || (password.length >= 6 && passwordsMatch && !isSubmitting)

  const resolvedSubmitLabel =
    submitLabel ??
    (mode === 'create'
      ? 'Crear perfil'
      : mode === 'edit'
        ? 'Guardar cambios'
        : mode === 'phone'
          ? 'Guardar cambios'
          : 'Cambiar contraseña')

  function handlePasswordOnlyChange(event) {
    onChange?.({
      target: {
        name: 'password',
        value: event.target.value,
      },
    })
  }

  return (
    <form className={cn('mt-5 grid gap-4', className)} onSubmit={onSubmit}>
      {isPhoneMode ? (
        <>
          {phoneDescription ? (
            <p className="text-sm text-foreground/55">{phoneDescription}</p>
          ) : null}
          <label>
            <FieldLabel required>Numero celular</FieldLabel>
            <input
              className={FIELD_CLASS}
              name="phone"
              value={values?.phone ?? ''}
              placeholder="Numero celular"
              minLength={10}
              onChange={onChange}
              required
            />
          </label>
        </>
      ) : null}

      {isPasswordMode ? (
        <>
          {passwordDescription ? (
            <p className="text-sm text-foreground/55">{passwordDescription}</p>
          ) : null}
          <PasswordInput
            name="password"
            value={password}
            placeholder={
              requireConfirm ? 'Nueva contraseña' : passwordPlaceholder
            }
            onChange={requireConfirm ? onChange : handlePasswordOnlyChange}
            required
          />
          {requireConfirm ? (
            <>
              <PasswordInput
                name="confirmPassword"
                value={confirmPassword}
                placeholder="Confirmar contraseña"
                onChange={onChange}
                required
              />
              {hasPasswordConfirmation ? (
                <p
                  className={cn(
                    'rounded-2xl px-4 py-3 text-sm font-semibold',
                    passwordsMatch
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                      : 'bg-red-500/10 text-red-700 dark:text-red-300',
                  )}
                >
                  {passwordsMatch
                    ? 'Coinciden las contraseñas.'
                    : 'Las contraseñas no coinciden.'}
                </p>
              ) : null}
            </>
          ) : null}
        </>
      ) : null}

      {!isPasswordMode && !isPhoneMode ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <FieldLabel required>Nombre</FieldLabel>
              <input
                className={FIELD_CLASS}
                name="name"
                value={values?.name ?? ''}
                placeholder="Nombre"
                onChange={onChange}
                required
              />
            </label>
            <label>
              <FieldLabel required>Apellido</FieldLabel>
              <input
                className={FIELD_CLASS}
                name="last_name"
                value={values?.last_name ?? ''}
                placeholder="Apellido"
                onChange={onChange}
                required
              />
            </label>
          </div>

          <NicknameField
            name={values?.name}
            lastName={values?.last_name}
            suffix={nicknameSuffix}
            profiles={profiles}
            excludeProfileId={excludeProfileId}
            onSuffixChange={onNicknameSuffixChange}
          />

          <label>
            <FieldLabel required>Correo</FieldLabel>
            <input
              className={FIELD_CLASS}
              type="email"
              name="email"
              value={values?.email ?? ''}
              placeholder="Correo"
              onChange={onChange}
              required
            />
          </label>

          <label>
            <FieldLabel required>Cedula</FieldLabel>
            <input
              className={FIELD_CLASS}
              name="identification"
              value={values?.identification ?? ''}
              placeholder="Cedula"
              minLength={8}
              onChange={onChange}
              required
            />
          </label>

          <label>
            <FieldLabel>Numero celular</FieldLabel>
            <input
              className={FIELD_CLASS}
              name="phone"
              value={values?.phone ?? ''}
              placeholder="Numero celular"
              minLength={10}
              onChange={onChange}
            />
          </label>

          <label>
            <FieldLabel required>Rol</FieldLabel>
            <AppSelect
              value={values?.role ?? 'technician'}
              options={PROFILE_ROLE_OPTIONS}
              onValueChange={onRoleChange}
            />
          </label>

          {mode === 'create' ? (
            <label>
              <FieldLabel required>Contraseña inicial</FieldLabel>
              <PasswordInput
                name="password"
                value={values?.password ?? ''}
                placeholder="Contraseña inicial"
                onChange={onChange}
                required
              />
            </label>
          ) : null}
        </>
      ) : null}

      <AppButton
        type="submit"
        className="w-full"
        variant={requireConfirm ? 'dark' : 'solid'}
        disabled={isPasswordMode && requireConfirm && !canSubmitPassword}
        isLoading={isSubmitting}
      >
        {resolvedSubmitLabel}
      </AppButton>
    </form>
  )
}

export default InputProfile
