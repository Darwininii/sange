import { GiCog } from 'react-icons/gi'
import { cn } from '@/lib/utils'

const sizeStyles = {
  sm: 'size-4',
  md: 'size-6',
  lg: 'size-10',
}

function Loader({ label = 'Cargando...', size = 'md', className = '' }) {
  const sizeClass = sizeStyles[size] || sizeStyles.md

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center gap-2 text-black dark:text-white text-lg font-black',
        className,
      )}
    >
      <GiCog className={cn(sizeClass, 'animate-spin text-black dark:text-white')} />
      {label ? <span className="text-lg font-black">{label}</span> : null}
    </span>
  )
}

export default Loader
