import Loader from '@/hooks/Loader'
import Close from '@/shared/Close'
import { cn } from '@/lib/utils'

const VARIANT_STYLES = {
  default: {
    bar: 'bg-foreground/40',
    title: 'text-foreground',
  },
  accent: {
    bar: 'bg-primary',
    title: 'text-primary',
  },
  success: {
    bar: 'bg-emerald-400',
    title: 'text-green-600',
  },
  warning: {
    bar: 'bg-amber-400',
    title: 'text-amber-600',
  },
  danger: {
    bar: 'bg-red-400',
    title: 'text-red-600',
  },
}

function ToastCard({
  message,
  description,
  variant = 'default',
  isLoading = false,
  visible,
  onClose,
}) {
  const styles = VARIANT_STYLES[variant] ?? VARIANT_STYLES.default

  return (
    <div
      className={cn(
        'group pointer-events-auto flex w-[min(360px,calc(100vw-2rem))] items-start gap-3 rounded-3x1 bg-surface px-4 py-3 shadow-lg shadow-black/40 ring-1 ring-border transition-all duration-200',
        visible ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0',
      )}
      role="status"
      aria-live="polite"
    >
      <span
        className={cn('mt-1 h-8 w-1 shrink-0 rounded-full', styles.bar)}
        aria-hidden="true"
      />

      <div className="min-w-0 flex-1">
        {isLoading ? (
          <Loader
            label={message}
            size="sm"
            className="justify-start text-foreground/70 [&>svg]:text-black dark:[&>svg]:text-white"
          />
        ) : (
          <>
            <p className={cn('text-sm font-semibold leading-5', styles.title)}>
              {message}
            </p>
            {description ? (
              <p className="mt-0.5 text-xs leading-5 text-foreground/55">
                {description}
              </p>
            ) : null}
          </>
        )}
      </div>

      {!isLoading ? (
        <Close
          aria-label="Cerrar notificacion"
          tooltip="Cerrar"
          className="size-8 shrink-0 opacity-0 pointer-events-none transition-opacity group-hover:opacity-100 group-hover:pointer-events-auto"
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            onClose?.()
          }}
        />
      ) : null}
    </div>
  )
}

export default ToastCard
