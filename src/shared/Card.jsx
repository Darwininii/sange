import { cn } from '@/lib/utils'

function Card({ className, children, ...props }) {
  return (
    <article
      className={cn(
        'flex h-full flex-col overflow-hidden rounded-3xl bg-background ring-1 ring-border shadow-sm transition hover:ring-primary/40',
        className,
      )}
      {...props}
    >
      {children}
    </article>
  )
}

function CardMedia({
  src,
  alt = '',
  className,
  imgClassName,
  fit = 'cover',
  fallback = null,
}) {
  if (!src) {
    return (
      <div
        className={cn(
          'flex aspect-4/3 items-center justify-center bg-surface text-sm font-medium text-foreground/40',
          className,
        )}
      >
        {fallback ?? 'Sin imagen'}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'aspect-4/3 overflow-hidden bg-surface',
        className,
      )}
    >
      <img
        src={src}
        alt={alt}
        className={cn(
          'size-full',
          fit === 'contain' ? 'object-contain' : 'object-cover',
          imgClassName,
        )}
        loading="lazy"
      />
    </div>
  )
}

function CardHeader({ className, children, ...props }) {
  return (
    <div className={cn('flex flex-col gap-1 px-4 pt-4', className)} {...props}>
      {children}
    </div>
  )
}

function CardTitle({ className, children, ...props }) {
  return (
    <h4
      className={cn(
        'font-display text-xl font-semibold leading-tight text-foreground',
        className,
      )}
      {...props}
    >
      {children}
    </h4>
  )
}

function CardDescription({ className, children, ...props }) {
  return (
    <p
      className={cn('text-sm leading-relaxed text-foreground/55', className)}
      {...props}
    >
      {children}
    </p>
  )
}

function CardContent({ className, children, ...props }) {
  return (
    <div className={cn('flex flex-1 flex-col gap-3 px-4 py-3', className)} {...props}>
      {children}
    </div>
  )
}

function CardFooter({ className, children, ...props }) {
  return (
    <div
      className={cn(
        'mt-auto flex flex-wrap items-center justify-end gap-2 border-t border-border/70 px-4 py-3',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export {
  Card,
  CardMedia,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
}

export default Card
