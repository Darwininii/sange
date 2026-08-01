import { lazy, Suspense, useMemo } from 'react'
import AppCheckBox from './AppCheckBox'
import {
  getScheduleIssueMessages,
  getScheduleIssues,
  splitScheduleValue,
} from './scheduleValidation'

const DatePicker = lazy(() => import('./DatePicker'))
const TimePicker = lazy(() => import('./TimePicker'))

const dateFallback = (
  <div className="h-18 animate-pulse rounded-2xl bg-foreground/5" />
)

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

/** Keeps date and time independent until both are set. */
function joinDateTimeLocal(date, time) {
  const safeDate = String(date ?? '').trim()
  const safeTime = String(time ?? '').trim()

  if (safeDate && safeTime) {
    return `${safeDate}T${safeTime}`
  }

  if (safeDate) {
    return safeDate
  }

  if (safeTime) {
    return `T${safeTime}`
  }

  return ''
}

/**
 * Combined calendar + time control.
 * Value: `YYYY-MM-DDTHH:mm`, date-only, `THH:mm`, or empty.
 */
function DateTimePicker({
  label = 'Fecha y hora',
  value = '',
  onChange,
  required = false,
  disabled = false,
  enabled = true,
  onEnabledChange,
  hint = '',
  datePlaceholder = 'Seleccionar fecha',
  timePlaceholder = 'Seleccionar hora',
}) {
  const { date, time } = splitScheduleValue(value)
  const canEdit = Boolean(enabled) && !disabled
  const showEnableToggle = typeof onEnabledChange === 'function'
  const warningMessages = useMemo(() => {
    if (!enabled) {
      return []
    }

    return getScheduleIssueMessages(
      getScheduleIssues(value).filter(
        (issue) => issue === 'past-date' || issue === 'past-time',
      ),
    )
  }, [enabled, value])

  function emit(nextDate, nextTime) {
    if (!canEdit) {
      return
    }

    onChange?.(joinDateTimeLocal(nextDate, nextTime))
  }

  return (
    <div className="grid gap-4">
      {label ? <FieldLabel required={required}>{label}</FieldLabel> : null}

      {/* Same 2-col + gap as OrderFormView so Fecha/Hora line up with fields below. */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex items-end gap-2">
          {showEnableToggle ? (
            <AppCheckBox
              checked={Boolean(enabled)}
              disabled={disabled}
              aria-label="Activar programacion para el tecnico"
              className="mb-2.5 shrink-0 p-1"
              onChange={onEnabledChange}
            />
          ) : null}
          <div className="min-w-0 flex-1">
            <span className="mb-1 block text-sm font-bold text-foreground/85">
              Fecha
            </span>
            <Suspense fallback={dateFallback}>
              <DatePicker
                value={date}
                placeholder={datePlaceholder}
                disabled={!canEdit}
                onChange={(nextDate) => emit(nextDate, time)}
              />
            </Suspense>
          </div>
        </div>

        <div>
          <span className="mb-1 block text-sm font-bold text-foreground/85">
            Hora
          </span>
          <Suspense fallback={dateFallback}>
            <TimePicker
              value={time}
              placeholder={timePlaceholder}
              disabled={!canEdit}
              onChange={(nextTime) => emit(date, nextTime)}
            />
          </Suspense>
        </div>
      </div>

      {warningMessages.length > 0 ? (
        <div className="rounded-2xl bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
          {warningMessages.map((message) => (
            <p key={message} className="font-semibold">
              {message}
            </p>
          ))}
        </div>
      ) : null}

      {hint ? (
        <p className="text-xs text-foreground/50">{hint}</p>
      ) : null}
    </div>
  )
}

export default DateTimePicker
