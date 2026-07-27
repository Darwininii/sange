export const PAYMENT_TYPE_OPTIONS = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'bank', label: 'Banco' },
]

export const BANK_OPTIONS = [
  { value: 'bancolombia', label: 'Bancolombia' },
  { value: 'davivienda', label: 'Davivienda' },
  { value: 'banco_bogota', label: 'Banco de Bogota' },
  { value: 'bbva', label: 'BBVA' },
  { value: 'banco_popular', label: 'Banco Popular' },
  { value: 'banco_occidente', label: 'Banco de Occidente' },
  { value: 'nequi', label: 'Nequi' },
  { value: 'daviplata', label: 'Daviplata' },
  { value: 'otro', label: 'Otro' },
]

export const EMPTY_ABONO_ROW = {
  totalPrice: '',
  amount: '',
  balance: '',
  paymentType: '',
  bank: '',
  bankOther: '',
  registeredAt: '',
}

function toMoneyString(value) {
  if (value === null || value === undefined || value === '') return ''
  const n = Number(value)
  if (!Number.isFinite(n)) return String(value).trim()
  // Keep integers as-is; otherwise trim trailing zeros lightly via String of rounded cents
  return String(Math.round(n * 100) / 100)
}

function parseMoney(value) {
  const n = Number(String(value ?? '').trim())
  return Number.isFinite(n) ? n : null
}

export function createEmptyAbonoRow(overrides = {}) {
  return {
    ...EMPTY_ABONO_ROW,
    ...overrides,
  }
}

export function createEmptyAbonos(count = 1) {
  return Array.from({ length: count }, () => createEmptyAbonoRow())
}

/**
 * Recalculates balance for each row and propagates previous balance into the
 * next row's totalPrice (chain). Row 0 keeps its own totalPrice.
 */
export function recalculateAbonoChain(rows) {
  const list = Array.isArray(rows) ? rows : []
  let previousBalance = null

  return list.map((row, index) => {
    const next = { ...EMPTY_ABONO_ROW, ...row }

    if (index > 0 && previousBalance !== null) {
      next.totalPrice = toMoneyString(previousBalance)
    }

    const total = parseMoney(next.totalPrice)
    const amount = parseMoney(next.amount)
    if (total !== null && amount !== null) {
      next.balance = toMoneyString(total - amount)
      previousBalance = total - amount
    } else if (total !== null) {
      next.balance = toMoneyString(total)
      previousBalance = total
    } else {
      next.balance = ''
      previousBalance = null
    }

    if (next.paymentType !== 'bank') {
      next.bank = ''
      next.bankOther = ''
    } else if (next.bank !== 'otro') {
      next.bankOther = ''
    }

    return next
  })
}

export function normalizeAbonoRows(
  abonos,
  { minRows = 1, stampMissingDates = false } = {},
) {
  const rows = Array.isArray(abonos) ? abonos : []
  const bankValues = new Set(BANK_OPTIONS.map((option) => option.value))
  const normalized = rows.map((row) => {
    const paymentType =
      row?.paymentType === 'bank' || row?.paymentType === 'cash'
        ? row.paymentType
        : ''
    const bankRaw = String(row?.bank ?? '').trim()
    const bank =
      paymentType === 'bank' && bankValues.has(bankRaw) ? bankRaw : ''
    const bankOther =
      paymentType === 'bank' && bank === 'otro'
        ? String(row?.bankOther ?? '').trim()
        : ''
    const registeredAt = String(row?.registeredAt ?? '').trim()

    return {
      totalPrice: String(row?.totalPrice ?? '').trim(),
      amount: String(row?.amount ?? '').trim(),
      balance: String(row?.balance ?? '').trim(),
      paymentType,
      bank,
      bankOther,
      registeredAt:
        stampMissingDates && !registeredAt
          ? new Date().toISOString()
          : registeredAt,
    }
  })

  while (normalized.length < minRows) {
    normalized.push(createEmptyAbonoRow())
  }

  return recalculateAbonoChain(normalized)
}

export function formatAbonoDateTime(iso) {
  const raw = String(iso ?? '').trim()
  if (!raw) return '—'

  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleString('es-CO', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}
