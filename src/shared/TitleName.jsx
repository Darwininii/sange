import { GiAutoRepair } from 'react-icons/gi'
import AppButton from './AppButton'
import { cn } from '@/lib/utils'

const DEFAULT_TITLE = 'Sange'

const TITLE_FONT =
  'text-sm font-semibold uppercase tracking-[0.24em] text-primary'

const variantStyles = {
  sidebar: {
    root: 'w-full justify-start gap-3 rounded-2xl px-2 py-3 hover:bg-foreground/6 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:p-0',
    title: TITLE_FONT,
    subtitle: '-mt-0.5 truncate text-[11px] font-medium text-foreground/55',
    description: 'mt-1 text-sm text-foreground/55',
  },
  login: {
    root: 'max-w-xl',
    title: `mb-0 ${TITLE_FONT}`,
    subtitle:
      'font-display text-5xl font-semibold leading-tight tracking-tight text-foreground',
    description: 'mt-6 text-lg leading-8 text-foreground/60',
  },
  plain: {
    root: '',
    title: TITLE_FONT,
    subtitle: 'text-sm text-foreground/55',
    description: 'mt-2 text-sm text-foreground/55',
  },
}

function TitleName({
  title = DEFAULT_TITLE,
  subtitle,
  description,
  variant = 'plain',
  icon: Icon = GiAutoRepair,
  showIcon = variant === 'sidebar' || variant === 'login',
  to,
  className,
  titleClassName,
  subtitleClassName,
  descriptionClassName,
  iconClassName = 'size-8 text-primary',
}) {
  const styles = variantStyles[variant] ?? variantStyles.plain
  const resolvedIconClassName = cn(iconClassName)

  const titleNode = (
    <strong className={cn(styles.title, titleClassName)}>{title}</strong>
  )

  const textBlock = (
    <span
      className={cn(
        'flex min-w-0 flex-col text-left',
        variant === 'sidebar' && 'group-data-[collapsible=icon]:hidden',
      )}
    >
      {variant === 'login' && showIcon ? (
        <span className="mb-4 flex items-center gap-3">
          <Icon
            className={cn(resolvedIconClassName, 'shrink-0')}
            aria-hidden="true"
          />
          {titleNode}
        </span>
      ) : (
        titleNode
      )}
      {subtitle ? (
        variant === 'login' ? (
          <h2 className={cn(styles.subtitle, subtitleClassName)}>{subtitle}</h2>
        ) : (
          <span className={cn(styles.subtitle, subtitleClassName)}>{subtitle}</span>
        )
      ) : null}
      {description ? (
        <p className={cn(styles.description, descriptionClassName)}>{description}</p>
      ) : null}
    </span>
  )

  if (to) {
    return (
      <AppButton
        to={to}
        variant="ghost"
        leftIcon={showIcon ? Icon : undefined}
        iconClassName={resolvedIconClassName}
        className={cn(styles.root, className)}
      >
        {textBlock}
      </AppButton>
    )
  }

  return <div className={cn(styles.root, className)}>{textBlock}</div>
}

export default TitleName
