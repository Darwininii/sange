import { useRef } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react'
import { HiOutlineBell } from 'react-icons/hi2'
import AppButton from '@/shared/AppButton'
import { cn } from '@/lib/utils'

const DOCK_SPRING = { mass: 0.1, stiffness: 150, damping: 12 }

const PANEL_HEIGHT = 30
const BASE_ITEM_SIZE = 50
const MAGNIFICATION = 60
const DISTANCE = 200

function DockButton({
  mouseX,
  icon: Icon,
  label,
  onClick,
  baseItemSize = BASE_ITEM_SIZE,
  magnification = MAGNIFICATION,
  distance = DISTANCE,
}) {
  const ref = useRef(null)

  const mouseDistance = useTransform(mouseX, (val) => {
    const rect = ref.current?.getBoundingClientRect() ?? {
      x: 0,
      width: baseItemSize,
    }
    return val - rect.x - baseItemSize / 2
  })

  const targetSize = useTransform(
    mouseDistance,
    [-distance, 0, distance],
    [baseItemSize, magnification, baseItemSize],
  )
  const size = useSpring(targetSize, DOCK_SPRING)

  return (
    <motion.div
      ref={ref}
      style={{ width: size, height: size }}
      className="relative flex shrink-0 items-center justify-center"
    >
      <AppButton
        variant="ghost"
        icon={Icon}
        iconClassName="size-6"
        onClick={onClick}
        aria-label={label}
        tooltip={label}
        className="size-10 rounded-full bg-background/40 p-0 text-foreground shadow-lg shadow-black/30 ring-2 dark:ring-border ring-black/30 dark:hover:bg-primary/15 hover:bg-white dark:hover:text-accent hover:ring-black/80 hover:text-black dark:hover:ring-primary/40"
      />
    </motion.div>
  )
}

function PageHeader({ title, onBellClick, className = '' }) {
  const mouseX = useMotionValue(Infinity)

  return (
    <section className={cn('flex justify-start py-3', className)}>
      <div
        onMouseMove={(event) => mouseX.set(event.pageX)}
        onMouseLeave={() => mouseX.set(Infinity)}
        style={{ height: PANEL_HEIGHT }}
        className="flex items-center gap-4 rounded-full bg-linear-to-br from-background to-surface pl-6 pr-3 shadow-xl shadow-black/30 ring-1 ring-border"
      >
        <h2 className="font-display whitespace-nowrap text-base font-semibold tracking-tight text-foreground md:text-lg">
          {title}
        </h2>
        <DockButton
          mouseX={mouseX}
          icon={HiOutlineBell}
          label="Notificaciones"
          onClick={onBellClick}
        />
      </div>
    </section>
  )
}

export default PageHeader
