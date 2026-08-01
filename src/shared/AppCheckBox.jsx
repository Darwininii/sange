import { useId } from 'react'
import { FaCheck } from "react-icons/fa";
import { cn } from '@/lib/utils'

function AppCheckBox({
  id,
  checked = false,
  onChange,
  label,
  className = '',
  disabled = false,
  'aria-label': ariaLabel,
}) {
  const generatedId = useId()
  const inputId = id || generatedId

  return (
    <label
      htmlFor={inputId}
      className={cn(
        'group relative inline-flex cursor-pointer items-center rounded-lg p-2 transition-all',
        'hover:bg-white/30 dark:hover:bg-white/5',
        disabled && 'cursor-not-allowed opacity-60 hover:bg-transparent dark:hover:bg-transparent',
        className,
      )}
    >
      <input
        type="checkbox"
        id={inputId}
        className="peer sr-only"
        checked={checked}
        disabled={disabled}
        aria-label={ariaLabel || (typeof label === 'string' ? label : undefined)}
        onChange={() => onChange?.(!checked)}
      />
      <div
        className={cn(
          'relative flex size-5 items-center justify-center rounded-md border-2 bg-white transition-all duration-300',
          'border-black/70 dark:border-white/70 dark:bg-gray-800',
          'peer-checked:border-rose-500 peer-checked:bg-linear-to-br peer-checked:from-rose-500 peer-checked:to-rose-600',
          'dark:peer-checked:border-rose-600 dark:peer-checked:from-rose-600 dark:peer-checked:to-rose-700',
          'peer-focus:ring-2 peer-focus:ring-rose-500/20 peer-focus:ring-offset-2',
          'dark:peer-focus:ring-rose-400/20 dark:peer-focus:ring-offset-gray-900',
        )}
      >
        {checked ? (
          <FaCheck
            size={20}
            className="scale-102 text-white transition-transform duration-200"
          />
        ) : null}
      </div>
      {label ? (
        <span
          className={cn(
            'ml-3 select-none text-sm font-bold text-black transition-colors',
            'dark:text-white/70',
            'group-hover:text-rose-600 dark:group-hover:text-rose-400',
            'peer-checked:font-semibold peer-checked:text-rose-600 dark:peer-checked:text-rose-400',
          )}
        >
          {label}
        </span>
      ) : null}
    </label>
  )
}

export default AppCheckBox
