import { PiCellSignalXBold } from 'react-icons/pi'
import { GravityStarsBackground } from '@/components/animate-ui/components/backgrounds/gravity-stars'
import AppButton from '@/shared/AppButton'
import TitleName from '@/shared/TitleName'

function PageOffline() {
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

        <div className="mt-10 flex size-20 items-center justify-center rounded-full bg-[#f4ead5]/10 ring-1 ring-[#f4ead5]/20">
          <PiCellSignalXBold className="size-10 text-[#f4ead5]" aria-hidden="true" />
        </div>

        <p className="mt-8 text-xs font-bold uppercase tracking-[0.35em] text-[#f4ead5]/55">
          Sin conexion
        </p>
        <h1 className="font-display mt-3 text-4xl font-semibold tracking-tight text-[#f4ead5] sm:text-5xl md:text-6xl">
          No hay internet
        </h1>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-[#f4ead5]/65 sm:text-base">
          Revisa tu conexion e intenta de nuevo. La aplicacion volvera sola cuando
          recuperes el acceso a la red.
        </p>

        <div className="pointer-events-auto mt-8">
          <AppButton
            type="button"
            effect="shine"
            onClick={() => window.location.reload()}
            className="rounded-2xl bg-[#f4ead5] px-6 text-[#0a0f1c] hover:bg-white"
          >
            Reintentar
          </AppButton>
        </div>
      </div>
    </main>
  )
}

export default PageOffline
