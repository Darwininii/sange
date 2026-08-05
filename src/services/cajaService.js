import { isSupabaseConfigured, supabase } from '../lib/supabaseClient'
import { BANK_OPTIONS, PAYMENT_TYPE_OPTIONS } from '../shared/orderAbonos'
import { getOrders } from './orderService'
import {
  activityActions,
  registerActivitySafe,
} from './activityService'

const ENTRY_SELECT =
  'id, kind, amount, payment_type, bank, concept, occurred_on, created_by, created_at, updated_at'

const CLOSE_SELECT =
  'id, close_date, closed_at, closed_by, cash_total, bank_total, income_total, expense_total, net_total, notes, snapshot, created_at'

export const INITIAL_CASH_ENTRY_VALUES = {
  kind: 'expense',
  amount: '',
  paymentType: 'cash',
  bank: '',
  concept: '',
  occurredOn: '',
}

function requireSupabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(
      'Supabase no esta configurado. Revisa VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.',
    )
  }

  return supabase
}

function isMissingTableError(error) {
  const message = String(error?.message ?? error ?? '').toLowerCase()
  const code = String(error?.code ?? '')
  return (
    code === '42P01' ||
    code === 'PGRST205' ||
    message.includes('schema cache') ||
    message.includes('does not exist') ||
    message.includes('could not find the table')
  )
}

export function toDateKey(value = new Date()) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value
  }

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function isSameDateKey(value, dateKey) {
  if (!value) {
    return false
  }

  // Always compare in local time — ISO UTC prefixes can fall on the wrong day.
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return false
  }

  return toDateKey(date) === dateKey
}

function getSaleAmount(order) {
  const abonos = Array.isArray(order?.abonos) ? order.abonos : []
  const paidTotal = abonos.reduce((sum, row) => {
    const amount = Number(row?.amount)
    return sum + (Number.isFinite(amount) && amount > 0 ? amount : 0)
  }, 0)

  if (paidTotal > 0) {
    return paidTotal
  }

  const totalPrice = Number(abonos[0]?.totalPrice)
  if (Number.isFinite(totalPrice) && totalPrice > 0) {
    return totalPrice
  }

  const serviceCost = Number(order?.serviceCost)
  if (Number.isFinite(serviceCost) && serviceCost > 0) {
    return serviceCost
  }

  return 0
}

function paymentTypeLabel(value) {
  return (
    PAYMENT_TYPE_OPTIONS.find((option) => option.value === value)?.label ||
    '—'
  )
}

function bankLabel(value) {
  return BANK_OPTIONS.find((option) => option.value === value)?.label || value || '—'
}

function mapCashEntry(row) {
  if (!row) {
    return null
  }

  return {
    id: row.id,
    kind: row.kind,
    amount: Number(row.amount ?? 0),
    paymentType: row.payment_type ?? 'cash',
    bank: row.bank ?? '',
    concept: row.concept ?? '',
    occurredOn: row.occurred_on ?? null,
    createdBy: row.created_by ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  }
}

function mapCashClose(row) {
  if (!row) {
    return null
  }

  return {
    id: row.id,
    closeDate: row.close_date ?? null,
    closedAt: row.closed_at ?? null,
    closedBy: row.closed_by ?? null,
    cashTotal: Number(row.cash_total ?? 0),
    bankTotal: Number(row.bank_total ?? 0),
    incomeTotal: Number(row.income_total ?? 0),
    expenseTotal: Number(row.expense_total ?? 0),
    netTotal: Number(row.net_total ?? 0),
    notes: row.notes ?? '',
    snapshot: row.snapshot ?? {},
    createdAt: row.created_at ?? null,
  }
}

/**
 * Caja movements for a local day:
 * - Any order with paid abonos (amount > 0)
 * - Orders with tipo de servicio = Ventas (serviceCondition === 'sales')
 */
export function buildOrderMovementsForDate(orders, dateKey) {
  const movements = []
  const list = Array.isArray(orders) ? orders : []

  for (const order of list) {
    const abonos = Array.isArray(order.abonos) ? order.abonos : []
    // UI label "Tipo de servicio" → serviceCondition; Ventas = 'sales'
    const isSales = order.serviceCondition === 'sales'
    let hasPaidAbonoForDay = false

    abonos.forEach((abono, index) => {
      const amount = Number(abono?.amount)
      if (!Number.isFinite(amount) || amount <= 0) {
        return
      }

      const occurredAt = abono?.registeredAt || order.createdAt
      if (!isSameDateKey(occurredAt, dateKey)) {
        return
      }

      hasPaidAbonoForDay = true
      const paymentType =
        abono?.paymentType === 'bank' || abono?.paymentType === 'cash'
          ? abono.paymentType
          : 'cash'

      movements.push({
        id: `order-${order.uuid || order.id}-abono-${index}`,
        kind: 'income',
        source: isSales ? 'sales' : 'abono',
        orderId: order.id,
        orderUuid: order.uuid,
        orderNumber: order.orderNumber,
        clientName: order.clientName || '',
        description: isSales
          ? `Orden de ventas (#${order.id})`
          : `Orden por abono (#${order.id})`,
        amount,
        paymentType,
        paymentTypeLabel: paymentTypeLabel(paymentType),
        bank: abono?.bank || '',
        bankLabel: bankLabel(abono?.bank),
        occurredAt,
        occurredOn: dateKey,
      })
    })

    // Ventas without a paid abono row for that day: still list the sale once.
    if (
      isSales &&
      !hasPaidAbonoForDay &&
      isSameDateKey(order.createdAt, dateKey)
    ) {
      const amount = getSaleAmount(order)
      const firstAbono = abonos[0] || {}
      const paymentType =
        firstAbono.paymentType === 'bank' || firstAbono.paymentType === 'cash'
          ? firstAbono.paymentType
          : 'cash'

      movements.push({
        id: `order-${order.uuid || order.id}-sale`,
        kind: 'income',
        source: 'sales',
        orderId: order.id,
        orderUuid: order.uuid,
        orderNumber: order.orderNumber,
        clientName: order.clientName || '',
        description: `Orden de ventas (#${order.id})`,
        amount,
        paymentType,
        paymentTypeLabel: paymentTypeLabel(paymentType),
        bank: firstAbono.bank || '',
        bankLabel: bankLabel(firstAbono.bank),
        occurredAt: order.createdAt,
        occurredOn: dateKey,
      })
    }
  }

  return movements.sort(
    (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime(),
  )
}

export function buildEntryMovements(entries, dateKey) {
  return (Array.isArray(entries) ? entries : [])
    .filter((entry) => entry.occurredOn === dateKey)
    .map((entry) => ({
      id: `entry-${entry.id}`,
      kind: entry.kind,
      source: 'manual',
      orderId: null,
      orderUuid: null,
      orderNumber: null,
      clientName: '',
      description:
        entry.kind === 'expense'
          ? `Gasto: ${entry.concept}`
          : `Ingreso: ${entry.concept}`,
      amount: Number(entry.amount) || 0,
      paymentType: entry.paymentType,
      paymentTypeLabel: paymentTypeLabel(entry.paymentType),
      bank: entry.bank || '',
      bankLabel: bankLabel(entry.bank),
      occurredAt: entry.createdAt || `${entry.occurredOn}T12:00:00`,
      occurredOn: entry.occurredOn,
      entryId: entry.id,
      concept: entry.concept,
    }))
}

export function summarizeMovements(movements = []) {
  let incomeTotal = 0
  let expenseTotal = 0
  let cashTotal = 0
  let bankTotal = 0

  for (const row of movements) {
    const amount = Number(row.amount) || 0
    if (row.kind === 'expense') {
      expenseTotal += amount
      if (row.paymentType === 'bank') {
        bankTotal -= amount
      } else {
        cashTotal -= amount
      }
      continue
    }

    incomeTotal += amount
    if (row.paymentType === 'bank') {
      bankTotal += amount
    } else {
      cashTotal += amount
    }
  }

  return {
    incomeTotal,
    expenseTotal,
    cashTotal,
    bankTotal,
    netTotal: incomeTotal - expenseTotal,
    count: movements.length,
  }
}

export async function getCashEntries({ from, to } = {}) {
  const client = requireSupabase()
  let query = client
    .from('cash_entries')
    .select(ENTRY_SELECT)
    .order('occurred_on', { ascending: false })
    .order('created_at', { ascending: false })

  if (from) {
    query = query.gte('occurred_on', from)
  }
  if (to) {
    query = query.lte('occurred_on', to)
  }

  const { data, error } = await query

  if (error) {
    if (isMissingTableError(error)) {
      return []
    }
    throw new Error(`No se pudieron cargar los movimientos de caja: ${error.message}`)
  }

  return (data ?? []).map(mapCashEntry)
}

export async function createCashEntry(entryData, { createdBy } = {}) {
  const client = requireSupabase()
  const kind = entryData.kind === 'income' ? 'income' : 'expense'
  const amount = Number(entryData.amount)
  const concept = String(entryData.concept ?? '').trim()
  const paymentType =
    entryData.paymentType === 'bank' ? 'bank' : 'cash'
  const occurredOn = toDateKey(entryData.occurredOn || new Date())

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('El valor debe ser mayor a 0.')
  }

  if (!concept) {
    throw new Error('El concepto es obligatorio.')
  }

  const { data, error } = await client
    .from('cash_entries')
    .insert({
      kind,
      amount,
      payment_type: paymentType,
      bank: paymentType === 'bank' ? String(entryData.bank ?? '').trim() : '',
      concept,
      occurred_on: occurredOn,
      created_by: createdBy ?? null,
    })
    .select(ENTRY_SELECT)
    .single()

  if (error) {
    throw new Error(`No se pudo registrar el movimiento: ${error.message}`)
  }

  const created = mapCashEntry(data)

  await registerActivitySafe({
    userId: createdBy,
    action: activityActions.caja_entry_create,
    metadata: {
      entryId: created.id,
      kind: created.kind,
      amount: created.amount,
      concept: created.concept,
      occurredOn: created.occurredOn,
    },
  })

  return created
}

export async function deleteCashEntry(entryId) {
  const client = requireSupabase()

  if (!entryId) {
    throw new Error('Movimiento invalido.')
  }

  const { error } = await client.from('cash_entries').delete().eq('id', entryId)

  if (error) {
    throw new Error(`No se pudo eliminar el movimiento: ${error.message}`)
  }

  await registerActivitySafe({
    action: activityActions.caja_entry_delete,
    metadata: { entryId },
  })

  return true
}

export async function getCashCloseForDate(dateKey) {
  const client = requireSupabase()
  const key = toDateKey(dateKey)

  const { data, error } = await client
    .from('cash_closes')
    .select(CLOSE_SELECT)
    .eq('close_date', key)
    .maybeSingle()

  if (error) {
    if (isMissingTableError(error)) {
      return null
    }
    throw new Error(`No se pudo consultar el cierre de caja: ${error.message}`)
  }

  return mapCashClose(data)
}

/**
 * Build day report from already-loaded orders + optional caja tables.
 * Prefer passing `orders` from the shared orders cache to avoid extra fetches.
 */
export function buildCajaDayReportFromData(
  dateKey,
  { orders = [], entries = [], cashClose = null } = {},
) {
  const key = toDateKey(dateKey)
  const orderMovements = buildOrderMovementsForDate(orders, key)
  const entryMovements = buildEntryMovements(entries, key)
  const movements = [...orderMovements, ...entryMovements].sort(
    (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime(),
  )
  const summary = summarizeMovements(movements)

  return {
    dateKey: key,
    movements,
    entries,
    summary,
    cashClose,
    isClosed: Boolean(cashClose),
  }
}

export async function getCajaDayReport(dateKey, { orders } = {}) {
  const key = toDateKey(dateKey)
  const [resolvedOrders, entries, cashClose] = await Promise.all([
    orders ? Promise.resolve(orders) : getOrders(),
    getCashEntries({ from: key, to: key }),
    getCashCloseForDate(key),
  ])

  return buildCajaDayReportFromData(key, {
    orders: resolvedOrders,
    entries,
    cashClose,
  })
}

export async function closeCashDay(
  dateKey,
  { closedBy, notes = '' } = {},
) {
  const client = requireSupabase()
  const key = toDateKey(dateKey)
  const existing = await getCashCloseForDate(key)

  if (existing) {
    throw new Error('La caja de este dia ya fue cerrada.')
  }

  const report = await getCajaDayReport(key)
  const { summary, movements } = report

  const { data, error } = await client
    .from('cash_closes')
    .insert({
      close_date: key,
      closed_by: closedBy ?? null,
      cash_total: summary.cashTotal,
      bank_total: summary.bankTotal,
      income_total: summary.incomeTotal,
      expense_total: summary.expenseTotal,
      net_total: summary.netTotal,
      notes: String(notes ?? '').trim(),
      snapshot: {
        dateKey: key,
        summary,
        movements,
      },
    })
    .select(CLOSE_SELECT)
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error('La caja de este dia ya fue cerrada.')
    }
    throw new Error(`No se pudo cerrar la caja: ${error.message}`)
  }

  const closed = mapCashClose(data)

  await registerActivitySafe({
    userId: closedBy,
    action: activityActions.caja_close,
    metadata: {
      closeDate: key,
      incomeTotal: summary.incomeTotal,
      expenseTotal: summary.expenseTotal,
      netTotal: summary.netTotal,
    },
  })

  return closed
}
