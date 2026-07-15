import { cn } from '@/lib/utils'
import AppButton from './AppButton'

const toneStyles = {
  default:
    'bg-white dark:bg-amber-600/10 border-x-1 border-y-2 border-border text-foreground/70 hover:bg-surface dark:hover:text-amber-400/80',
  blue: 'bg-white border-x-1 border-y-2 border-blue-600 text-blue-500 hover:bg-blue-600/20 hover:text-blue-600 dark:bg-blue-600/10 dark:text-blue-400',
  emerald:
    'bg-white dark:bg-green-500/20 dark:text-foreground/70 dark:hover:text-emerald-600 border-x-1 border-y-2 border-green-600/30 text-green-500 hover:bg-green-600/20 hover:text-emerald-600',
  red: 'bg-white dark:bg-red-600/20 dark:text-foreground/70 dark:hover:text-red-500 border-x-1 border-y-2 border-red-400/50 text-red-400 hover:bg-red-600/20 hover:text-red-600',
}

function ProfileActionButton({
  icon,
  label,
  tooltip,
  tone = 'default',
  className,
  ...props
}) {
  return (
    <AppButton
      variant="outline"
      size="icon"
      effect="zoomIn"
      icon={icon}
      aria-label={label}
      tooltip={tooltip ?? label}
      className={cn(toneStyles[tone] || toneStyles.default, className)}
      {...props}
    />
  )
}

export default ProfileActionButton
