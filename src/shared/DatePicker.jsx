import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { FaCalendarDays } from 'react-icons/fa6'
import { LuArrowBigRight } from 'react-icons/lu'
import { TiArrowBackOutline } from 'react-icons/ti'
import AppButton from './AppButton'
import { cn } from '@/lib/utils'
import 'cally'

const FIELD_SHELL =
  'flex h-auto w-full items-center gap-2 rounded-2xl border border-border bg-background px-3 py-2 outline-none transition focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/20'

const MONTH_LABELS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
]

const YEAR_PAGE_SIZE = 12

/** Labels for week starting Monday (Cally default firstDayOfWeek=1) */
const WEEKDAY_LABELS = ['l', 'm', 'mi', 'j', 'v', 's', 'd']

function FieldLabel({ children, required = false }) {
  return (
    <span className="mb-1 flex items-center gap-1 text-sm font-bold text-foreground/85">
      {children}
      {required ? (
        <span className="size-2.5 text-red-500" aria-hidden="true">
          *
        </span>
      ) : null}
    </span>
  )
}

function parseIsoDate(value) {
  const raw = String(value ?? '').trim()

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [year, month, day] = raw.split('-').map(Number)
    return { year, month, day }
  }

  const now = new Date()
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  }
}

function toIsoDate({ year, month, day }) {
  const lastDay = new Date(year, month, 0).getDate()
  const safeDay = Math.min(day, lastDay)

  return `${year}-${String(month).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`
}

function currentYear() {
  return new Date().getFullYear()
}

/** ISO `YYYY-MM-DD` → `DD/MM/YYYY`. */
function formatDisplayDate(value) {
  const raw = String(value ?? '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return ''
  }

  const [year, month, day] = raw.split('-')
  return `${day}/${month}/${year}`
}

function isValidIsoDate(year, month, day) {
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    month < 1 ||
    month > 12 ||
    day < 1
  ) {
    return false
  }

  const date = new Date(year, month - 1, day)
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  )
}

function clampDayDigits(dayDigits) {
  if (dayDigits.length === 0) {
    return ''
  }

  if (dayDigits.length === 1) {
    return dayDigits[0] > '3' ? '3' : dayDigits
  }

  let day = Number(dayDigits.slice(0, 2))
  if (!Number.isFinite(day) || day < 1) {
    day = 1
  }
  if (day > 31) {
    day = 31
  }

  return String(day).padStart(2, '0')
}

function clampMonthDigits(monthDigits) {
  if (monthDigits.length === 0) {
    return ''
  }

  if (monthDigits.length === 1) {
    return monthDigits[0] > '1' ? '1' : monthDigits
  }

  let month = Number(monthDigits.slice(0, 2))
  if (!Number.isFinite(month) || month < 1) {
    month = 1
  }
  if (month > 12) {
    month = 12
  }

  return String(month).padStart(2, '0')
}

/**
 * Mask while typing: DD/MM/ + current year once month is complete.
 * Example: 15 → 15/ → 1502 → 15/02/2026
 */
function maskDateTyping(raw) {
  const digits = String(raw ?? '')
    .replace(/\D/g, '')
    .slice(0, 8)

  if (!digits) {
    return ''
  }

  const day = clampDayDigits(digits.slice(0, 2))
  const month = clampMonthDigits(digits.slice(2, 4))

  if (digits.length <= 2) {
    return digits.length === 2 ? `${day}/` : day
  }

  if (digits.length < 4) {
    return `${day}/${month}`
  }

  if (digits.length === 4) {
    return `${day}/${month}/${currentYear()}`
  }

  return `${day}/${month}/${digits.slice(4)}`
}

/** Accepts `YYYY-MM-DD` or `DD/MM/YYYY` (year defaults to current if omitted). */
function parseTypedDate(raw) {
  const normalized = String(raw ?? '').trim()

  if (!normalized) {
    return ''
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    const [year, month, day] = normalized.split('-').map(Number)
    return isValidIsoDate(year, month, day) ? normalized : null
  }

  const masked = maskDateTyping(normalized)
  const dmy = masked.match(/^(\d{2})\/(\d{2})\/(\d{1,4})$/)
  if (!dmy) {
    return null
  }

  const day = Number(dmy[1])
  const month = Number(dmy[2])
  const year = dmy[3].length === 4 ? Number(dmy[3]) : currentYear()

  if (!isValidIsoDate(year, month, day)) {
    return null
  }

  return toIsoDate({ year, month, day })
}

function DatePicker({
  label,
  value = '',
  onChange,
  required = false,
  placeholder = 'Seleccionar fecha',
  disabled = false,
}) {
  const panelId = useId()
  const containerRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [view, setView] = useState('days') // days | months | years
  const [inputFocused, setInputFocused] = useState(false)
  const [text, setText] = useState(() => formatDisplayDate(value))
  const [focused, setFocused] = useState(() => parseIsoDate(value))
  const [yearWindowStart, setYearWindowStart] = useState(
    () => parseIsoDate(value).year - 6,
  )
  const focusedIso = toIsoDate(focused)
  const datePlaceholder =
    placeholder === 'Seleccionar fecha' ? 'dd/mm/aaaa' : placeholder

  const yearOptions = useMemo(
    () =>
      Array.from({ length: YEAR_PAGE_SIZE }, (_, index) => yearWindowStart + index),
    [yearWindowStart],
  )

  useEffect(() => {
    if (!inputFocused) {
      setText(formatDisplayDate(value))
    }
  }, [value, inputFocused])

  useEffect(() => {
    if (!open) {
      return undefined
    }

    function handlePointerDown(event) {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false)
        setView('days')
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        if (view !== 'days') {
          setView('days')
          return
        }
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, view])

  function commitTypedText(raw = text) {
    const parsed = parseTypedDate(raw)

    if (parsed === '') {
      onChange?.('')
      setText('')
      return
    }

    if (parsed == null) {
      setText(formatDisplayDate(value))
      return
    }

    onChange?.(parsed)
    setText(formatDisplayDate(parsed))
    setFocused(parseIsoDate(parsed))
  }

  function openYearsView() {
    setYearWindowStart(focused.year - 6)
    setView('years')
  }

  function selectYear(year) {
    setFocused((current) => ({
      ...current,
      year,
      day: Math.min(current.day, new Date(year, current.month, 0).getDate()),
    }))
    setView('days')
  }

  function selectMonth(month) {
    setFocused((current) => ({
      ...current,
      month,
      day: Math.min(current.day, new Date(current.year, month, 0).getDate()),
    }))
    setView('days')
  }

  function shiftMonth(delta) {
    setFocused((current) => {
      const next = new Date(current.year, current.month - 1 + delta, 1)
      const year = next.getFullYear()
      const month = next.getMonth() + 1
      const lastDay = new Date(year, month, 0).getDate()

      return {
        year,
        month,
        day: Math.min(current.day, lastDay),
      }
    })
    setView('days')
  }

  function shiftYearWindow(deltaPages) {
    setYearWindowStart((current) => current + deltaPages * YEAR_PAGE_SIZE)
  }

  return (
    <div className="relative w-full" ref={containerRef}>
      {label ? <FieldLabel required={required}>{label}</FieldLabel> : null}

      <div
        className={cn(
          FIELD_SHELL,
          disabled && 'cursor-not-allowed opacity-60',
        )}
      >
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          disabled={disabled}
          value={text}
          placeholder={datePlaceholder}
          aria-label={label || 'Fecha'}
          className="min-w-0 flex-1 cursor-text bg-transparent px-1 py-1 text-sm text-foreground outline-none placeholder:text-foreground/45 disabled:cursor-not-allowed"
          onFocus={() => {
            setInputFocused(true)
            setText(formatDisplayDate(value) || text)
          }}
          onChange={(event) => setText(maskDateTyping(event.target.value))}
          onBlur={() => {
            setInputFocused(false)
            commitTypedText()
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              commitTypedText()
              event.currentTarget.blur()
            }
          }}
        />
        <AppButton
          type="button"
          size="icon"
          variant="ghost"
          disabled={disabled}
          icon={FaCalendarDays}
          tooltip="Elegir fecha"
          className="size-9 shrink-0 cursor-pointer rounded-xl"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => {
            if (open) {
              setOpen(false)
              return
            }

            const nextFocused = parseIsoDate(value)
            setFocused(nextFocused)
            setYearWindowStart(nextFocused.year - 6)
            setView('days')
            setOpen(true)
          }}
        />
      </div>

      <input type="hidden" value={value || ''} required={required} readOnly />

      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label={label || 'Calendario'}
          className="sange-date-picker absolute inset-x-0 z-40 mt-1.5 w-full max-w-70 rounded-xl border border-border bg-surface p-2 shadow-xl shadow-black/25"
        >
          {view === 'years' ? (
            <div className="grid gap-1">
              <div className="mb-1 flex items-center justify-between gap-1">
                <AppButton
                  type="button"
                  size="icon"
                  variant="outline"
                  icon={LuArrowBigRight}
                  iconClassName="size-5 rotate-180"
                  className="size-8 rounded-md"
                  tooltip="Años anteriores"
                  aria-label="Años anteriores"
                  onClick={() => shiftYearWindow(-1)}
                />

                <AppButton
                  type="button"
                  size="sm"
                  variant="outline"
                  leftIcon={TiArrowBackOutline}
                  className="px-2 py-1 text-[11px] font-semibold"
                  onClick={() => setView('days')}
                >
                  Atrás
                </AppButton>

                <AppButton
                  type="button"
                  size="icon"
                  variant="outline"
                  icon={LuArrowBigRight}
                  iconClassName="size-5"
                  className="size-8 rounded-md"
                  tooltip="Años siguientes"
                  aria-label="Años siguientes"
                  onClick={() => shiftYearWindow(1)}
                />
              </div>

              <p className="mb-0.5 text-center text-[11px] font-semibold text-foreground">
                Seleccionar año
              </p>

              <div className="grid grid-cols-3 gap-1">
                {yearOptions.map((year) => {
                  const isActive = year === focused.year

                  return (
                    <AppButton
                      key={year}
                      type="button"
                      size="sm"
                      variant={isActive ? 'solid' : 'ghost'}
                      className="rounded-lg px-1.5 py-1.5 text-xs font-semibold"
                      onClick={() => selectYear(year)}
                    >
                      {year}
                    </AppButton>
                  )
                })}
              </div>
            </div>
          ) : null}

          {view === 'months' ? (
            <div className="grid gap-1">
              <div className="mb-1 flex justify-center">
                <AppButton
                  type="button"
                  size="sm"
                  variant="outline"
                  leftIcon={TiArrowBackOutline}
                  className="px-2 py-1 text-[11px] font-semibold"
                  onClick={() => setView('days')}
                >
                  Atrás
                </AppButton>
              </div>

              <p className="mb-0.5 text-center text-[11px] font-semibold text-foreground">
                Seleccionar mes
              </p>

              <div className="grid grid-cols-3 gap-1">
                {MONTH_LABELS.map((monthLabel, index) => {
                  const month = index + 1
                  const isActive = month === focused.month

                  return (
                    <AppButton
                      key={monthLabel}
                      type="button"
                      size="sm"
                      variant={isActive ? 'solid' : 'ghost'}
                      className="rounded-lg px-1.5 py-1.5 text-xs font-semibold capitalize"
                      onClick={() => selectMonth(month)}
                    >
                      {monthLabel.slice(0, 3)}
                    </AppButton>
                  )
                })}
              </div>
            </div>
          ) : null}

          {view === 'days' ? (
            <>
              <div className="mb-1 flex items-center justify-between gap-1">
                <AppButton
                  type="button"
                  size="icon"
                  variant="outline"
                  icon={LuArrowBigRight}
                  iconClassName="size-6 rotate-180"
                  className="size-8 rounded-md"
                  tooltip="Mes anterior"
                  aria-label="Mes anterior"
                  onClick={() => shiftMonth(-1)}
                />

                <div className="flex min-w-0 items-center gap-1">
                  <AppButton
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-md px-1.5 py-0.5 text-sm font-bold"
                    onClick={openYearsView}
                  >
                    {focused.year}
                  </AppButton>

                  <AppButton
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-md px-1.5 py-0.5 text-xs font-medium capitalize"
                    onClick={() => setView('months')}
                  >
                    {MONTH_LABELS[focused.month - 1]}
                  </AppButton>
                </div>

                <AppButton
                  type="button"
                  size="icon"
                  variant="outline"
                  icon={LuArrowBigRight}
                  iconClassName="size-6"
                  className="size-8 rounded-md"
                  tooltip="Mes siguiente"
                  aria-label="Mes siguiente"
                  onClick={() => shiftMonth(1)}
                />
              </div>

              <table
                className="sange-date-picker-weekdays mb-0.5"
                aria-hidden="true"
              >
                <tbody>
                  <tr>
                    {WEEKDAY_LABELS.map((label, index) => (
                      <th key={`${label}-${index}`} scope="col">
                        <span>{label}</span>
                      </th>
                    ))}
                  </tr>
                </tbody>
              </table>

              <calendar-date
                value={value || undefined}
                focused-date={focusedIso}
                locale="es-CO"
                onchange={(event) => {
                  const nextValue = event.target?.value || ''
                  onChange?.(nextValue)
                  setOpen(false)
                  setView('days')
                }}
                onfocusday={(event) => {
                  const detail = event.detail
                  if (!(detail instanceof Date) || Number.isNaN(detail.getTime())) {
                    return
                  }

                  setFocused({
                    year: detail.getFullYear(),
                    month: detail.getMonth() + 1,
                    day: detail.getDate(),
                  })
                }}
              >
                <calendar-month />
              </calendar-date>
            </>
          ) : null}

          {value ? (
            <AppButton
              type="button"
              size="sm"
              variant="outline"
              className="mt-1 w-full justify-center rounded-lg px-2 py-1 text-[11px] font-semibold text-foreground/60"
              onClick={() => {
                onChange?.('')
                setOpen(false)
                setView('days')
              }}
            >
              Limpiar fecha
            </AppButton>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export default DatePicker
