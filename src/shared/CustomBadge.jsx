import { cn } from '@/lib/utils'

const colorStyles = {
  red: 'border border-red-700/25 bg-red-700/10 text-red-800 dark:border-red-400/25 dark:bg-red-500/15 dark:text-red-200',
  green:
    'border border-emerald-700/25 bg-emerald-700/10 text-emerald-800 dark:border-emerald-400/25 dark:bg-emerald-500/15 dark:text-emerald-200',
  amber:
    'border border-amber-700/25 bg-amber-700/10 text-amber-900 dark:border-amber-400/25 dark:bg-amber-500/15 dark:text-amber-100',
  blue: 'border border-[#1A2340]/20 bg-[#1A2340]/8 text-[#1A2340] dark:border-primary/30 dark:bg-primary/15 dark:text-primary',
  neutral:
    'border border-[#1A2340]/15 bg-[#1A2340]/5 text-[#1A2340]/80 dark:border-border dark:bg-foreground/5 dark:text-foreground/70',
  white:
    'border border-[#1A2340]/15 bg-white/70 text-[#1A2340]/75 dark:border-border dark:bg-surface dark:text-foreground/70',
  default: 'bg-primary text-primary-foreground',
}

function CustomBadge({
  count,
  label,
  className,
  animate = true,
  color = 'neutral',
}) {
  if (label) {
    return (
      <span
        className={cn(
          'inline-flex w-fit select-none items-center rounded-md px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider',
          animate && 'transition duration-200 hover:scale-105',
          colorStyles[color] || colorStyles.neutral,
          className,
        )}
      >
        {label}
      </span>
    )
  }

  if (count === undefined || count <= 0) {
    return null
  }

  return (
    <span
      className={cn(
        'flex items-center justify-center rounded-full text-[11px] font-black',
        animate && 'transition duration-200 hover:scale-110',
        colorStyles.default,
        className,
      )}
    >
      {count}
    </span>
  )
}

export default CustomBadge
