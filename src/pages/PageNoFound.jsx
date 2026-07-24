import { useNavigate } from '@tanstack/react-router'
import { GravityStarsBackground } from '@/components/animate-ui/components/backgrounds/gravity-stars'
import AppButton from '@/shared/AppButton'
import TitleName from '@/shared/TitleName'
import { useAuthStore } from '@/store/authStore'

function PageNoFound() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const homeTo = user ? '/dashboard' : '/'

  return (
    <main className="relative min-h-svh overflow-hidden bg-[#0a0f1c] text-white">
      <GravityStarsBackground
        className="absolute inset-0 text-[#f4ead5]"
        starsCount={90}
        starsSize={2}
        starsOpacity={0.8}
        glowIntensity={18}
        movementSpeed={0.25}
        mouseInfluence={140}
        mouseGravity="attract"
        gravityStrength={80}
      />

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(10,15,28,0.55)_70%,rgba(10,15,28,0.9)_100%)]" />

      <div className="relative z-10 flex min-h-svh flex-col items-center justify-center px-6 py-12 text-center">
        <TitleName
          variant="login"
          className="mx-auto max-w-none [&_>span]:items-center [&_>span]:text-center"
          titleClassName="text-[#f4ead5]/70"
          iconClassName="size-10 text-[#f4ead5]"
        />

        <p className="mt-10 text-xs font-bold uppercase tracking-[0.35em] text-[#f4ead5]/55">
          Error 404
        </p>
        <h1 className="font-display mt-3 text-4xl font-semibold tracking-tight text-[#f4ead5] sm:text-5xl md:text-6xl">
          Pagina no encontrada
        </h1>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-[#f4ead5]/65 sm:text-base">
          La ruta que intentas abrir no existe o no tienes acceso para verla.
        </p>

        <div className="pointer-events-auto mt-8 flex flex-wrap items-center justify-center gap-3">
          <AppButton
            type="button"
            effect="shine"
            onClick={() => navigate({ to: homeTo })}
            className="rounded-2xl bg-[#f4ead5] px-6 text-[#0a0f1c] hover:bg-white"
          >
            {user ? 'Ir al dashboard' : 'Ir al inicio'}
          </AppButton>
          {user ? (
            <AppButton
              type="button"
              variant="outline"
              effect="zoomIn"
              onClick={() => window.history.back()}
              className="rounded-2xl border-[#f4ead5]/30 bg-transparent text-[#f4ead5] hover:bg-[#f4ead5]/10 hover:text-white"
            >
              Volver atras
            </AppButton>
          ) : null}
        </div>
      </div>
    </main>
  )
}

export default PageNoFound
