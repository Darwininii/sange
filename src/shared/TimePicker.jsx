import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { FaClock } from 'react-icons/fa6'
import AppButton from './AppButton'
import { cn } from '@/lib/utils'

const FIELD_SHELL =
  'flex h-auto w-full items-center gap-2 rounded-2xl border border-border bg-background px-3 py-2 outline-none transition focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/20'

const HOURS_12 = Array.from({ length: 12 }, (_, index) => index + 1)
const MINUTES = Array.from({ length: 60 }, (_, index) => index)
const PERIODS = [
  { value: 'am', label: 'a. m.' },
  { value: 'pm', label: 'p. m.' },
]

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

function parseTimeValue(value) {
  const raw = String(value ?? '').trim()
  const match = raw.match(/^(\d{2}):(\d{2})$/)

  if (!match) {
    return null
  }

  const hours24 = Number(match[1])
  const minutes = Number(match[2])

  if (
    !Number.isFinite(hours24) ||
    !Number.isFinite(minutes) ||
    hours24 < 0 ||
    hours24 > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null
  }

  const period = hours24 >= 12 ? 'pm' : 'am'
  const hour12 = hours24 % 12 === 0 ? 12 : hours24 % 12

  return { hour12, minutes, period, hours24 }
}

function toTimeValue({ hour12, minutes, period }) {
  let hours24 = Number(hour12) % 12
  if (period === 'pm') {
    hours24 += 12
  }

  return `${String(hours24).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function periodLabel(period) {
  return period === 'pm' ? 'p. m.' : 'a. m.'
}

/** Stored `HH:mm` (24h) → `2:20 p. m.` */
function formatDisplayTime(value) {
  const parsed = parseTimeValue(value)
  if (!parsed) {
    return ''
  }

  return `${parsed.hour12}:${String(parsed.minutes).padStart(2, '0')} ${periodLabel(parsed.period)}`
}

function extractPeriod(raw) {
  const lower = String(raw ?? '').toLowerCase()

  if (/(p\.\s*m\.?|\bpm\b)/.test(lower)) {
    return 'pm'
  }
  if (/(a\.\s*m\.?|\bam\b)/.test(lower)) {
    return 'am'
  }

  // Lone trailing a/p after digits (e.g. "2:20p")
  if (/\d\s*p\s*$/.test(lower) || /:\d{0,2}\s*p\s*$/.test(lower)) {
    return 'pm'
  }
  if (/\d\s*a\s*$/.test(lower) || /:\d{0,2}\s*a\s*$/.test(lower)) {
    return 'am'
  }

  return null
}

/**
 * Mask while typing for 12h clock.
 * Hour <= 12, minutes <= 59, am/pm → "a. m." / "p. m."
 * Example: 2:20 p. m.
 */
function maskTimeTyping(raw) {
  const source = String(raw ?? '')
  if (!source.trim()) {
    return ''
  }

  const period = extractPeriod(source)
  const body = source
    .toLowerCase()
    .replace(/a\.\s*m\.?|p\.\s*m\.?|\bam\b|\bpm\b/g, '')
    .replace(/[ap]\s*$/g, '')

  const digits = body.replace(/\D/g, '')
  if (!digits && !period) {
    return ''
  }

  let hour = ''
  let minuteDigits = ''

  if (digits.length > 0) {
    const first = digits[0]

    if (first === '0') {
      hour = digits.slice(0, Math.min(2, digits.length))
      if (hour.length === 2) {
        const hourNum = Math.min(12, Math.max(1, Number(hour)))
        hour = String(hourNum)
        minuteDigits = digits.slice(2, 4)
      }
    } else if (first === '1') {
      if (digits.length === 1) {
        hour = '1'
      } else if ('012'.includes(digits[1])) {
        hour = digits.slice(0, 2)
        minuteDigits = digits.slice(2, 4)
      } else {
        hour = '1'
        minuteDigits = digits.slice(1, 3)
      }
    } else {
      // 2-9: single-digit hour (max 12 handled above for 1x)
      hour = first
      minuteDigits = digits.slice(1, 3)
    }
  }

  if (hour) {
    const hourNum = Number(hour)
    if (Number.isFinite(hourNum) && hourNum > 12) {
      hour = '12'
    }
  }

  if (minuteDigits.length === 1 && minuteDigits[0] > '5') {
    minuteDigits = '5'
  }
  if (minuteDigits.length === 2) {
    const minuteNum = Number(minuteDigits)
    if (minuteNum > 59) {
      minuteDigits = '59'
    } else {
      minuteDigits = String(minuteNum).padStart(2, '0')
    }
  }

  const hourComplete =
    Boolean(hour) &&
    ((digits[0] === '1' && digits.length >= 2 && '012'.includes(digits[1])) ||
      (digits[0] === '0' && digits.length >= 2) ||
      (digits[0] >= '2' && digits[0] <= '9') ||
      minuteDigits.length > 0 ||
      body.includes(':'))

  let out = hour

  if (hour && (hourComplete || minuteDigits.length > 0 || body.includes(':'))) {
    out = `${hour}:`
    if (minuteDigits) {
      out += minuteDigits
    }
  }

  if (period) {
    const safeHour = hour || '12'
    const safeMinutes = minuteDigits.padStart(2, '0') || '00'
    out = `${safeHour}:${safeMinutes} ${periodLabel(period)}`
  }

  return out
}

/** Typed/masked text → stored `HH:mm` 24h, '' if empty, null if incomplete/invalid. */
function parseTypedTime(raw) {
  const normalized = String(raw ?? '').trim()
  if (!normalized) {
    return ''
  }

  const masked = maskTimeTyping(normalized)
  const match = masked.match(/^(\d{1,2}):(\d{2})\s*(a\.\s*m\.|p\.\s*m\.)$/i)
  if (!match) {
    return null
  }

  let hour12 = Number(match[1])
  const minutes = Number(match[2])
  const period = match[3].toLowerCase().includes('p') ? 'pm' : 'am'

  if (!Number.isFinite(hour12) || hour12 < 1 || hour12 > 12 || minutes > 59) {
    return null
  }

  return toTimeValue({ hour12, minutes, period })
}

function defaultDraft() {
  const now = new Date()
  const hours24 = now.getHours()
  return {
    hour12: hours24 % 12 === 0 ? 12 : hours24 % 12,
    minutes: now.getMinutes(),
    period: hours24 >= 12 ? 'pm' : 'am',
  }
}

function TimeColumn({ items, selected, onSelect, getKey, getLabel, listRef }) {
  return (
    <ul
      ref={listRef}
      className="max-h-52 flex-1 overflow-y-auto overscroll-contain rounded-lg bg-background/60 py-1 [scrollbar-gutter:stable]"
      role="listbox"
      onWheel={(event) => event.stopPropagation()}
    >
      {items.map((item) => {
        const key = getKey(item)
        const isActive = selected === key

        return (
          <li key={key} className="px-1">
            <button
              type="button"
              role="option"
              aria-selected={isActive}
              tabIndex={-1}
              className={cn(
                'flex w-full cursor-pointer items-center justify-center rounded-md px-2 py-1.5 text-sm font-semibold transition',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground/80 hover:bg-foreground/8',
              )}
              onClick={() => onSelect(item)}
            >
              {getLabel(item)}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function TimePicker({
  label,
  value = '',
  onChange,
  required = false,
  placeholder = 'Seleccionar hora',
  disabled = false,
}) {
  const panelId = useId()
  const containerRef = useRef(null)
  const hourListRef = useRef(null)
  const minuteListRef = useRef(null)
  const periodListRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [focused, setFocused] = useState(false)
  const [text, setText] = useState(() => formatDisplayTime(value))
  const [draft, setDraft] = useState(() => parseTimeValue(value) || defaultDraft())
  const timePlaceholder =
    placeholder === 'Seleccionar hora' ? 'h:mm a. m.' : placeholder

  const minuteItems = useMemo(
    () =>
      MINUTES.map((minute) => ({
        value: minute,
        label: String(minute).padStart(2, '0'),
      })),
    [],
  )

  useEffect(() => {
    if (!focused) {
      setText(formatDisplayTime(value))
    }
  }, [value, focused])

  useEffect(() => {
    if (!open) {
      return undefined
    }

    function handlePointerDown(event) {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false)
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      return
    }

    const activeButtons = [
      hourListRef.current?.querySelector('[aria-selected="true"]'),
      minuteListRef.current?.querySelector('[aria-selected="true"]'),
      periodListRef.current?.querySelector('[aria-selected="true"]'),
    ]

    // Only align once when the panel opens — not on every selection (breaks wheel scroll).
    activeButtons.forEach((node) => {
      node?.scrollIntoView({ block: 'center' })
    })
  }, [open])

  function commitDraft(nextDraft) {
    const nextValue = toTimeValue(nextDraft)
    onChange?.(nextValue)
    setText(formatDisplayTime(nextValue))
  }

  function commitTypedText(raw = text) {
    const parsed = parseTypedTime(raw)

    if (parsed === '') {
      onChange?.('')
      setText('')
      return
    }

    if (parsed == null) {
      setText(formatDisplayTime(value))
      return
    }

    onChange?.(parsed)
    setText(formatDisplayTime(parsed))
    setDraft(parseTimeValue(parsed) || defaultDraft())
  }

  function openPanel() {
    if (disabled) {
      return
    }

    setDraft(parseTimeValue(value) || defaultDraft())
    setOpen((current) => !current)
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
          inputMode="text"
          autoComplete="off"
          disabled={disabled}
          value={text}
          placeholder={timePlaceholder}
          aria-label={label || 'Hora'}
          className="min-w-0 flex-1 cursor-text bg-transparent px-1 py-1 text-sm text-foreground outline-none placeholder:text-foreground/45 disabled:cursor-not-allowed"
          onFocus={() => {
            setFocused(true)
            setText(formatDisplayTime(value) || text)
          }}
          onChange={(event) => setText(maskTimeTyping(event.target.value))}
          onBlur={() => {
            setFocused(false)
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
          icon={FaClock}
          tooltip="Elegir hora"
          className="size-9 shrink-0 cursor-pointer rounded-xl"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={openPanel}
        />
      </div>

      <input type="hidden" value={value || ''} required={required} readOnly />

      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label={label || 'Selector de hora'}
          className="absolute inset-x-0 z-40 mt-1.5 w-full max-w-70 rounded-xl border border-border bg-surface p-2 shadow-xl shadow-black/25"
        >
          <div className="mb-2 grid grid-cols-3 gap-1 px-1">
            <p className="text-center text-[11px] font-semibold text-foreground/55">
              Hora
            </p>
            <p className="text-center text-[11px] font-semibold text-foreground/55">
              Min
            </p>
            <p className="text-center text-[11px] font-semibold text-foreground/55">
              Periodo
            </p>
          </div>

          <div className="flex gap-1">
            <TimeColumn
              listRef={hourListRef}
              items={HOURS_12}
              selected={draft.hour12}
              getKey={(hour) => hour}
              getLabel={(hour) => String(hour).padStart(2, '0')}
              onSelect={(hour12) => {
                const next = { ...draft, hour12 }
                setDraft(next)
                commitDraft(next)
              }}
            />
            <TimeColumn
              listRef={minuteListRef}
              items={minuteItems}
              selected={draft.minutes}
              getKey={(item) => item.value}
              getLabel={(item) => item.label}
              onSelect={(item) => {
                const next = { ...draft, minutes: item.value }
                setDraft(next)
                commitDraft(next)
              }}
            />
            <TimeColumn
              listRef={periodListRef}
              items={PERIODS}
              selected={draft.period}
              getKey={(item) => item.value}
              getLabel={(item) => item.label}
              onSelect={(item) => {
                const next = { ...draft, period: item.value }
                setDraft(next)
                commitDraft(next)
              }}
            />
          </div>

          {value ? (
            <AppButton
              type="button"
              size="sm"
              variant="outline"
              className="mt-1 w-full cursor-pointer justify-center rounded-lg px-2 py-1 text-[11px] font-semibold text-foreground/60"
              onClick={() => {
                onChange?.('')
                setText('')
                setOpen(false)
              }}
            >
              Limpiar hora
            </AppButton>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export default TimePicker
