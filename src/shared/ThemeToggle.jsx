import { LuMoon, LuSun } from 'react-icons/lu'
import AppButton from '@/shared/AppButton'
import { useThemeStore } from '@/store/themeStore'
import { cn } from '@/lib/utils'

function ThemeToggle({ className, size = 'icon' }) {
  const theme = useThemeStore((state) => state.theme)
  const toggleTheme = useThemeStore((state) => state.toggleTheme)
  const isDark = theme === 'dark'
  const Icon = isDark ? LuSun : LuMoon
  const label = isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'

  return (
    <AppButton
      variant="outline"
      size={size}
      effect="zoomIn"
      icon={Icon}
      aria-label={label}
      tooltip={label}
      className={cn(
        'border-border bg-surface text-foreground hover:border-primary/40 hover:bg-primary/10 hover:text-primary',
        className,
      )}
      onClick={toggleTheme}
    />
  )
}

export default ThemeToggle
