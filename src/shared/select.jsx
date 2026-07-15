import { useState } from 'react'
import { TiArrowSortedDown, TiArrowSortedUp } from 'react-icons/ti'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

function AppSelect({
  value,
  onValueChange,
  options,
  placeholder = 'Seleccionar',
  className = '',
  contentClassName = '',
  triggerContent,
  ArrowIcon,
  arrowClassName = '',
  side = 'bottom',
  position = 'popper',
  clearOnSelect = false,
  hideIndicator = false,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [resetKey, setResetKey] = useState(0)

  function handleValueChange(nextValue) {
    onValueChange?.(nextValue)

    if (clearOnSelect) {
      // Remount: Radix no vuelve a disparar onValueChange si el valor no cambia.
      setResetKey((current) => current + 1)
      setIsOpen(false)
    }
  }

  return (
    <Select
      key={clearOnSelect ? resetKey : undefined}
      value={clearOnSelect ? undefined : value}
      onValueChange={handleValueChange}
      onOpenChange={setIsOpen}
    >
      <SelectTrigger
        className={cn(
          'h-auto w-full cursor-pointer rounded-2xl border-border bg-background px-4 py-3 text-foreground outline-none focus:border-primary focus:bg-surface focus:ring-4 focus:ring-primary/20 **:data-[slot=select-icon]:hidden',
          className,
        )}
      >
        {triggerContent ?? <SelectValue placeholder={placeholder} />}
        {ArrowIcon ? (
          <ArrowIcon
            className={cn(
              'size-4 shrink-0 text-foreground/55 transition-transform duration-200',
              isOpen && 'rotate-180',
              arrowClassName,
            )}
          />
        ) : isOpen ? (
          <TiArrowSortedUp className={cn('size-5 text-foreground/45', arrowClassName)} />
        ) : (
          <TiArrowSortedDown className={cn('size-5 text-foreground/45', arrowClassName)} />
        )}
      </SelectTrigger>
      <SelectContent
        side={side}
        position={position}
        className={cn(
          'z-60 border border-border bg-surface text-foreground shadow-xl shadow-black/40',
          hideIndicator && '**:data-[slot=select-item-indicator]:hidden',
          contentClassName,
        )}
      >
        {options.map((option) => {
          const Icon = option.icon

          return (
            <SelectItem
              className={cn(
                'cursor-pointer bg-surface text-foreground focus:bg-primary/15 data-highlighted:bg-primary/15 data-highlighted:text-amber-700 dark:data-highlighted:text-amber-400',
                hideIndicator && 'pr-2',
                option.className,
              )}
              value={option.value}
              key={option.value}
            >
              {Icon ? <Icon className="size-4 shrink-0" /> : null}
              {option.label}
            </SelectItem>
          )
        })}
      </SelectContent>
    </Select>
  )
}

export default AppSelect
