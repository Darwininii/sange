import AppButton from '../../shared/AppButton'
import CustomBadge from '../../shared/CustomBadge'
import { demoUsers } from '../../data/users'

function LoginForm({
  formData,
  isLoading,
  onChange,
  onSubmit,
  onUseDemoUser,
}) {
  return (
    <section className="w-full max-w-md rounded-3xl bg-surface p-8 shadow-xl shadow-black/40 ring-1 ring-border">
      <div className="mb-8">
        <CustomBadge
          className="mb-4"
          color="blue"
          label="Sistema de ordenes de servicio"
        />
        <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground">
          Iniciar sesion
        </h1>
        <p className="mt-2 text-sm leading-6 text-foreground/55">
          Ingresa con tu credencial y contraseña para abrir el panel segun tu rol.
        </p>
      </div>

      <form className="space-y-5" onSubmit={onSubmit}>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-foreground/80">
            Credencial de acceso
          </span>
          <input
            className="sange-input"
            type="text"
            name="nickname"
            value={formData.nickname}
            placeholder="darwin-nino"
            autoComplete="username"
            spellCheck={false}
            onChange={onChange}
            required
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-foreground/80">
            Contraseña
          </span>
          <input
            className="sange-input"
            type="password"
            name="password"
            value={formData.password}
            placeholder="Ingresa tu contraseña"
            autoComplete="current-password"
            onChange={onChange}
            required
          />
        </label>

        <AppButton
          type="submit"
          effect="zoomIn"
          className="w-full"
          disabled={isLoading}
          isLoading={isLoading}
        >
          Entrar al dashboard
        </AppButton>
      </form>

      <div className="mt-8 border-t border-border pt-6">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-foreground/40">
          Usuarios demo locales
        </p>
        <div className="grid gap-2">
          {demoUsers.map((user) => (
            <button
              className="flex items-center justify-between rounded-2xl border border-border px-4 py-3 text-left text-sm transition hover:border-primary/40 hover:bg-primary/10"
              type="button"
              key={user.id}
              onClick={() => onUseDemoUser(user)}
            >
              <span>
                <strong className="block text-foreground">{user.roleLabel}</strong>
                <span className="text-foreground/55">{user.nickname}</span>
              </span>
              <span className="text-xs font-semibold text-primary">Usar</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}

export default LoginForm
