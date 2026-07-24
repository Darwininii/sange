import { forwardRef, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import Loader from '@/hooks/Loader'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import CustomBadge from '@/shared/CustomBadge'

const baseStyles =
  'group relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-2xl font-semibold transition outline-none focus-visible:ring-4 focus-visible:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-60 aria-disabled:cursor-not-allowed aria-disabled:opacity-60'

const variantStyles = {
  solid:
    'bg-primary text-primary-foreground hover:bg-accent disabled:bg-border aria-disabled:bg-border',
  dark:
    'bg-background text-foreground ring-1 ring-border hover:bg-surface hover:text-accent disabled:bg-border aria-disabled:bg-border',
  outline:
    'border border-border text-foreground/75 hover:bg-surface hover:text-primary disabled:text-foreground/40 aria-disabled:text-foreground/40',
  ghost: 'text-foreground/75 hover:bg-surface hover:text-primary',
  danger:
    'bg-red-600 text-white hover:bg-red-500 disabled:bg-border aria-disabled:bg-border',
  success:
    'bg-emerald-600 text-white hover:bg-emerald-500 disabled:bg-border aria-disabled:bg-border',
  link: 'rounded-none px-0 text-primary underline-offset-4 hover:underline hover:text-accent',
}

const sizeStyles = {
  sm: 'px-3 py-2 text-xs',
  md: 'px-4 py-3 text-sm',
  lg: 'px-6 py-4 text-base',
  icon: 'size-11 p-0',
}

const iconSizeStyles = {
  sm: 'size-4',
  md: 'size-4',
  lg: 'size-5',
  icon: 'size-5',
}

const loaderSizeByButtonSize = {
  sm: 'sm',
  md: 'sm',
  lg: 'sm',
  icon: 'sm',
}

function mergeRefs(...refs) {
  return (node) => {
    refs.forEach((currentRef) => {
      if (!currentRef) return
      if (typeof currentRef === 'function') currentRef(node)
      else currentRef.current = node
    })
  }
}

const AppButton = forwardRef(function AppButton(
  {
    children,
    className,
    variant = 'solid',
    size = 'md',
    effect = 'none',
    isLoading = false,
    disabled = false,
    leftIcon: LeftIcon,
    rightIcon: RightIcon,
    icon: CenterIcon,
    iconClassName,
    shineColor,
    tooltip,
    tooltipSide = 'top',
    tooltipShowArrow = true,
    tooltipClassName,
    badgeCount,
    badgeClassName,
    to,
    href,
    type = 'button',
    onMouseMove,
    onMouseLeave,
    onClick,
    ...restProps
  },
  forwardedRef,
) {
  const magneticRef = useRef(null)
  const [magneticPosition, setMagneticPosition] = useState({ x: 0, y: 0 })
  const isDisabled = disabled || isLoading
  const iconSizeClass = iconSizeStyles[size] || iconSizeStyles.md

  const handleMouseMove = (event) => {
    onMouseMove?.(event)
    if (effect !== 'magnetic' || isDisabled || !magneticRef.current) return
    const rect = magneticRef.current.getBoundingClientRect()
    const x = event.clientX - rect.left - rect.width / 2
    const y = event.clientY - rect.top - rect.height / 2
    setMagneticPosition({ x: x * 0.3, y: y * 0.3 })
  }

  const handleMouseLeave = (event) => {
    onMouseLeave?.(event)
    if (effect !== 'magnetic') return
    setMagneticPosition({ x: 0, y: 0 })
  }

  const handleClick = (event) => {
    if (isDisabled) {
      event.preventDefault()
      return
    }
    onClick?.(event)
  }

  const buttonClassName = cn(
    baseStyles,
    variantStyles[variant] || variantStyles.solid,
    sizeStyles[size] || sizeStyles.md,
    effect === 'shine' && 'overflow-hidden',
    effect === 'magnetic' && 'transition-transform duration-200 ease-out',
    effect === 'zoomIn' &&
      'transition-transform duration-200 ease-out hover:scale-110 active:scale-95',
    className,
  )

  const magneticStyle =
    effect === 'magnetic'
      ? { transform: `translate(${magneticPosition.x}px, ${magneticPosition.y}px)` }
      : undefined

  const content = (
    <>
      {isLoading ? (
        <Loader
          size={loaderSizeByButtonSize[size] || 'sm'}
          label=""
          className="relative z-10"
        />
      ) : (
        <>
          {LeftIcon && (
            <LeftIcon className={cn(iconSizeClass, 'relative z-10', iconClassName)} />
          )}
          {children ? (
            <span className="relative z-10">{children}</span>
          ) : (
            CenterIcon && (
              <CenterIcon className={cn(iconSizeClass, 'relative z-10', iconClassName)} />
            )
          )}
          {RightIcon && (
            <RightIcon className={cn(iconSizeClass, 'relative z-10', iconClassName)} />
          )}
        </>
      )}
      <CustomBadge
        count={badgeCount}
        className={cn(
          'absolute top-0.5 right-0.5 z-20 size-5 min-w-5 text-[9px]',
          'group-data-[collapsible=icon]:top-0 group-data-[collapsible=icon]:right-0',
          badgeClassName,
        )}
      />
      {effect === 'shine' && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -translate-x-full transition-transform duration-700 ease-in-out group-hover:translate-x-full"
          style={{
            background: `linear-gradient(90deg, transparent, ${shineColor || 'rgba(244, 234, 213, 0.35)'}, transparent)`,
            transform: 'skewX(-20deg)',
          }}
        />
      )}
    </>
  )

  let buttonElement

  if (to) {
    buttonElement = (
      <Link
        ref={mergeRefs(forwardedRef, magneticRef)}
        to={to}
        className={buttonClassName}
        style={magneticStyle}
        aria-disabled={isDisabled || undefined}
        aria-busy={isLoading || undefined}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        {...restProps}
      >
        {content}
      </Link>
    )
  } else if (href) {
    buttonElement = (
      <a
        ref={mergeRefs(forwardedRef, magneticRef)}
        href={isDisabled ? undefined : href}
        className={buttonClassName}
        style={magneticStyle}
        aria-disabled={isDisabled || undefined}
        aria-busy={isLoading || undefined}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        {...restProps}
      >
        {content}
      </a>
    )
  } else {
    buttonElement = (
      <button
        ref={mergeRefs(forwardedRef, magneticRef)}
        type={type}
        className={buttonClassName}
        style={magneticStyle}
        disabled={isDisabled}
        aria-busy={isLoading || undefined}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        {...restProps}
      >
        {content}
      </button>
    )
  }

  if (!tooltip) {
    return buttonElement
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{buttonElement}</TooltipTrigger>
      <TooltipContent side={tooltipSide} showArrow={tooltipShowArrow} className={tooltipClassName}>
        {tooltip}
      </TooltipContent>
    </Tooltip>
  )
})

AppButton.displayName = 'AppButton'

export default AppButton
