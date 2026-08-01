export function splitScheduleValue(value) {
  const raw = String(value ?? '').trim()
  const full = raw.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/)

  if (full) {
    return { date: full[1], time: full[2] }
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return { date: raw, time: '' }
  }

  const timeOnly = raw.match(/^T?(\d{2}:\d{2})$/)
  if (timeOnly) {
    return { date: '', time: timeOnly[1] }
  }

  return { date: '', time: '' }
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function parseLocalDate(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/**
 * Returns warning codes for a scheduled technician slot.
 * - past-date: selected calendar day is before today
 * - past-time: selected time is already in the past (today, or with a past date)
 * - missing-time: schedule enabled conceptually but time empty (caller checks enabled)
 * - missing-date: time set without date
 */
export function getScheduleIssues(scheduledAt, { now = new Date() } = {}) {
  const { date, time } = splitScheduleValue(scheduledAt)
  const issues = []

  if (!date && !time) {
    return issues
  }

  if (time && !date) {
    issues.push('missing-date')
  }

  if (date && !time) {
    issues.push('missing-time')
  }

  if (date) {
    const selectedDay = startOfDay(parseLocalDate(date))
    const today = startOfDay(now)

    if (selectedDay.getTime() < today.getTime()) {
      issues.push('past-date')
    }

    if (time) {
      const [hours, minutes] = time.split(':').map(Number)
      const scheduled = new Date(
        selectedDay.getFullYear(),
        selectedDay.getMonth(),
        selectedDay.getDate(),
        hours,
        minutes,
        0,
        0,
      )

      if (scheduled.getTime() <= now.getTime()) {
        issues.push('past-time')
      }
    }
  } else if (time) {
    const [hours, minutes] = time.split(':').map(Number)
    const scheduled = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      hours,
      minutes,
      0,
      0,
    )

    if (scheduled.getTime() <= now.getTime()) {
      issues.push('past-time')
    }
  }

  return issues
}

export function getScheduleIssueMessages(issues = []) {
  const messages = []

  if (issues.includes('past-date')) {
    messages.push(
      'La fecha programada ya paso. Elige una fecha de hoy en adelante.',
    )
  }

  if (issues.includes('past-time')) {
    messages.push(
      'La hora programada ya paso. Elige una hora futura o cambia la fecha.',
    )
  }

  if (issues.includes('missing-date')) {
    messages.push(
      'Indica la fecha de programacion junto con la hora.',
    )
  }

  return messages
}
