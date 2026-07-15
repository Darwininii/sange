import { BadgeX } from 'lucide-react'
import AppButton from '@/shared/AppButton'
import { cn } from '@/lib/utils'

function Close({
  onClick,
  className,
  tooltip = 'Cerrar',
  tooltipSide = 'top',
  'aria-label': ariaLabel = 'Cerrar',
  ...restProps
}) {
  return (
    <AppButton
      variant="outline"
      size="icon"
      effect="zoomIn"
      icon={BadgeX}
      aria-label={ariaLabel}
      tooltip={tooltip}
      tooltipSide={tooltipSide}
      className={cn(
        'border-x border-y-2 border-red-400/50 bg-white text-red-400 hover:bg-red-600/20 hover:text-red-600 dark:bg-red-600/20 dark:text-foreground/70 dark:hover:text-red-500',
        className,
      )}
      onClick={onClick}
      {...restProps}
    />
  )
}

export default Close
