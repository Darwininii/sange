import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { FaFilePdf } from 'react-icons/fa6'
import { IoSearchCircleSharp } from 'react-icons/io5'
import { TbTrashX } from 'react-icons/tb'
import DashboardLayout from '../components/layout/DashboardLayout'
import Loader from '../hooks/Loader'
import appToast from '../hooks/appToast'
import { useCachedData } from '../hooks/useCachedData'
import { usePagination } from '../hooks/usePagination'
import AppButton from '../shared/AppButton'
import AppDialog from '../shared/dialog'
import AppSelect from '../shared/select'
import ConfirmActions from '../shared/ConfirmActions'
import CustomBadge from '../shared/CustomBadge'
import DashboardListSection from '../shared/DashboardListSection'
import DatePicker from '../shared/DatePicker'
import Pagination from '../shared/Pagination'
import ProfileActionButton from '../shared/ProfileActionButton'
import YesONo from '../shared/YesONo'

const CajaPdfPreviewDialog = lazy(() => import('../shared/CajaPdfPreviewDialog'))
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../shared/table'
import {
  BANK_OPTIONS,
  PAYMENT_TYPE_OPTIONS,
} from '../shared/orderAbonos'
import {
  buildCajaDayReportFromData,
  closeCashDay,
  createCashEntry,
  deleteCashEntry,
  getCashCloseForDate,
  getCashEntries,
  INITIAL_CASH_ENTRY_VALUES,
  toDateKey,
} from '../services/cajaService'
import { getOrders, subscribeOrdersChanges } from '../services/orderService'
import { useAuthStore } from '../store/authStore'
import { invalidateUserCache } from '../store/dataCacheStore'
import { signOutUser } from '../utils/auth'

const FIELD_CLASS =
  'w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none focus:border-primary focus:bg-white dark:focus:bg-transparent/10 focus:ring-4 focus:ring-primary/20'

const NUMBER_FIELD_CLASS = `${FIELD_CLASS} no-spinner`

const moneyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

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

function getErrorMessage(error, fallback) {
  return error instanceof Error ? error.message : fallback
}

function formatMoney(value) {
  return moneyFormatter.format(Number(value) || 0)
}

function formatDateLabel(dateKey) {
  const [year, month, day] = String(dateKey).split('-').map(Number)
  if (!year || !month || !day) {
    return dateKey
  }

  return new Date(year, month - 1, day).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function bumpDateCount(counts, raw) {
  if (!raw) {
    return
  }

  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) {
    return
  }

  const key = toDateKey(date)
  counts.set(key, (counts.get(key) || 0) + 1)
}

/** ISO dates → movement counts (abonos / ventas) for calendar badges. */
function collectCajaActivityDateCounts(orders) {
  const counts = new Map()

  for (const order of Array.isArray(orders) ? orders : []) {
    const abonos = Array.isArray(order.abonos) ? order.abonos : []
    const isSales = order.serviceCondition === 'sales'
    let hasPaidAbono = false

    for (const abono of abonos) {
      const amount = Number(abono?.amount)
      if (!Number.isFinite(amount) || amount <= 0) {
        continue
      }

      hasPaidAbono = true
      bumpDateCount(counts, abono?.registeredAt || order.createdAt)
    }

    if (isSales && !hasPaidAbono) {
      bumpDateCount(counts, order.createdAt)
    }
  }

  return counts
}

function formatTime(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return date.toLocaleTimeString('es-CO', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function matchesMovementSearch(row, query) {
  if (!query) {
    return true
  }

  const normalized = query.toLowerCase()
  const haystack = [
    row.description,
    row.clientName,
    row.orderId,
    row.paymentTypeLabel,
    row.bankLabel,
    row.concept,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return haystack.includes(normalized)
}

function SummaryCard({ label, value, tone = 'default' }) {
  const tones = {
    default: 'text-foreground',
    good: 'text-emerald-700 dark:text-emerald-300',
    bad: 'text-red-600 dark:text-red-400',
    muted: 'text-foreground/70',
  }

  return (
    <div className="flex flex-col">
      <FieldLabel>{label}</FieldLabel>
      <div className="rounded-2xl border border-border bg-background px-4 py-3">
        <p className={`text-lg font-bold tabular-nums ${tones[tone] || tones.default}`}>
          {value}
        </p>
      </div>
    </div>
  )
}

function DashboardCajaPage() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const isAdmin = user?.role === 'admin'
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()))
  const [search, setSearch] = useState('')
  const [isEntryDialogOpen, setIsEntryDialogOpen] = useState(false)
  const [entryForm, setEntryForm] = useState({
    ...INITIAL_CASH_ENTRY_VALUES,
    occurredOn: toDateKey(new Date()),
  })
  const [deleteEntryTarget, setDeleteEntryTarget] = useState(null)
  const [isCloseDialogOpen, setIsCloseDialogOpen] = useState(false)
  const [closeNotes, setCloseNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPdfOpen, setIsPdfOpen] = useState(false)

  // Reuse the shared orders cache (same as Ordenes) — do not refetch all orders for caja.
  const {
    data: ordersData,
    isLoading: isLoadingOrders,
    error: ordersError,
  } = useCachedData({
    cacheKey: 'orders',
    fetcher: getOrders,
    enabled: Boolean(user?.id),
    refetchOnFocus: true,
    subscribe: subscribeOrdersChanges,
  })

  const cajaMetaKey = `caja-meta:${selectedDate}`
  const {
    data: cajaMeta,
    isLoading: isLoadingCajaMeta,
    error: cajaMetaError,
    refetch: refetchCajaMeta,
  } = useCachedData({
    cacheKey: cajaMetaKey,
    fetcher: async () => {
      const [entries, cashClose] = await Promise.all([
        getCashEntries({ from: selectedDate, to: selectedDate }),
        getCashCloseForDate(selectedDate),
      ])
      return { entries, cashClose }
    },
    enabled: Boolean(user?.id && selectedDate),
  })

  const orders = useMemo(
    () => (Array.isArray(ordersData) ? ordersData : []),
    [ordersData],
  )

  const report = useMemo(
    () =>
      buildCajaDayReportFromData(selectedDate, {
        orders,
        entries: cajaMeta?.entries ?? [],
        cashClose: cajaMeta?.cashClose ?? null,
      }),
    [selectedDate, orders, cajaMeta],
  )

  const isLoading = isLoadingOrders || isLoadingCajaMeta
  const error = ordersError || cajaMetaError

  const movements = report.movements
  const summary = report.summary
  const isClosed = report.isClosed

  const pdfData = useMemo(() => {
    if (!isPdfOpen) {
      return null
    }

    return {
      dateKey: selectedDate,
      movements,
      summary,
      isClosed,
      closedByName: [user?.name, user?.lastName].filter(Boolean).join(' '),
    }
  }, [isPdfOpen, selectedDate, movements, summary, isClosed, user])

  const filteredMovements = useMemo(
    () => movements.filter((row) => matchesMovementSearch(row, search.trim())),
    [movements, search],
  )

  const cajaActivityCounts = useMemo(
    () => collectCajaActivityDateCounts(orders),
    [orders],
  )

  const cajaActivityDates = useMemo(
    () => Object.fromEntries(cajaActivityCounts),
    [cajaActivityCounts],
  )

  const otherAbonoDates = useMemo(
    () =>
      [...cajaActivityCounts.keys()]
        .sort((a, b) => (a < b ? 1 : -1))
        .filter((dateKey) => dateKey !== selectedDate)
        .slice(0, 3),
    [cajaActivityCounts, selectedDate],
  )

  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    paginate,
  } = usePagination({
    totalItems: filteredMovements.length,
    storageKey: 'caja-movements',
  })

  const visibleMovements = paginate(filteredMovements)

  useEffect(() => {
    setPage(1)
  }, [search, selectedDate, setPage])

  useEffect(() => {
    if (!error) {
      return
    }

    appToast.danger(getErrorMessage(error, 'No se pudo cargar la caja.'))
  }, [error])

  async function refreshCaja() {
    if (user?.id) {
      invalidateUserCache(user.id, cajaMetaKey)
      invalidateUserCache(user.id, 'orders')
    }
    await refetchCajaMeta({ silent: true, force: true })
  }

  async function handleLogout() {
    await signOutUser()
    logout()
    navigate({ to: '/' })
  }

  function handleEntryFormChange(event) {
    const { name, value } = event.target
    setEntryForm((current) => ({ ...current, [name]: value }))
  }

  async function handleCreateEntry(event) {
    event?.preventDefault?.()

    if (!String(entryForm.concept ?? '').trim()) {
      appToast.warning('El concepto es obligatorio.')
      return
    }

    if (!Number.isFinite(Number(entryForm.amount)) || Number(entryForm.amount) <= 0) {
      appToast.warning('El valor debe ser mayor a 0.')
      return
    }

    setIsSubmitting(true)

    try {
      await appToast.promise(
        createCashEntry(
          {
            ...entryForm,
            occurredOn: entryForm.occurredOn || selectedDate,
          },
          { createdBy: user?.id },
        ),
        {
          loading: 'Registrando movimiento...',
          success: 'Movimiento registrado.',
          error: (err) =>
            getErrorMessage(err, 'No se pudo registrar el movimiento.'),
        },
      )
      setIsEntryDialogOpen(false)
      setEntryForm({
        ...INITIAL_CASH_ENTRY_VALUES,
        occurredOn: selectedDate,
      })
      await refreshCaja()
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDeleteEntry() {
    if (!deleteEntryTarget?.entryId) {
      return
    }

    setIsSubmitting(true)

    try {
      await appToast.promise(deleteCashEntry(deleteEntryTarget.entryId), {
        loading: 'Eliminando...',
        success: 'Movimiento eliminado.',
        error: (err) =>
          getErrorMessage(err, 'No se pudo eliminar el movimiento.'),
      })
      setDeleteEntryTarget(null)
      await refreshCaja()
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleCloseCash() {
    if (isClosed) {
      appToast.warning('La caja de este dia ya esta cerrada.')
      return
    }

    setIsSubmitting(true)

    try {
      await appToast.promise(
        closeCashDay(selectedDate, {
          closedBy: user?.id,
          notes: closeNotes,
        }),
        {
          loading: 'Cerrando caja...',
          success: 'Caja del dia cerrada correctamente.',
          error: (err) => getErrorMessage(err, 'No se pudo cerrar la caja.'),
        },
      )
      setIsCloseDialogOpen(false)
      setCloseNotes('')
      await refreshCaja()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <DashboardLayout user={user} onLogout={handleLogout}>
      <DashboardListSection
        title="Caja"
        sectionTitle="Caja y finanzas"
        description="Consulta abonos, ventas, gastos e ingresos del dia. Genera el extracto y realiza el cierre diario."
        createLabel="Registrar gasto / ingreso"
        onCreate={() => {
          setEntryForm({
            ...INITIAL_CASH_ENTRY_VALUES,
            occurredOn: selectedDate,
          })
          setIsEntryDialogOpen(true)
        }}
        actions={
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full min-w-[12rem] overflow-visible sm:w-48">
              <DatePicker
                value={selectedDate}
                placeholder="dd/mm/aaaa"
                panelAlign="right"
                markedDates={cajaActivityDates}
                onChange={(next) => {
                  if (next) {
                    setSelectedDate(next)
                  }
                }}
              />
            </div>
            <div className="relative w-full min-w-[14rem] sm:w-64">
              <IoSearchCircleSharp className="pointer-events-none absolute left-3 top-1/2 size-6.5 -translate-y-1/2 text-foreground/45" />
              <input
                className="w-full rounded-2xl border border-border bg-background py-2.5 pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/20"
                value={search}
                placeholder="Buscar movimiento..."
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Buscar movimientos"
              />
            </div>
          </div>
        }
        footer={
          <>
            <AppDialog
              open={isEntryDialogOpen}
              title="Registrar movimiento"
              onOpenChange={setIsEntryDialogOpen}
            >
              <form onSubmit={handleCreateEntry}>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div>
                    <FieldLabel required>Tipo</FieldLabel>
                    <AppSelect
                      value={entryForm.kind}
                      options={[
                        { value: 'expense', label: 'Gasto' },
                        { value: 'income', label: 'Ingreso' },
                      ]}
                      onValueChange={(kind) =>
                        setEntryForm((current) => ({ ...current, kind }))
                      }
                    />
                  </div>
                  <label>
                    <FieldLabel required>Valor</FieldLabel>
                    <input
                      className={NUMBER_FIELD_CLASS}
                      name="amount"
                      type="number"
                      min="0"
                      step="1"
                      value={entryForm.amount}
                      onChange={handleEntryFormChange}
                      required
                    />
                  </label>
                  <div>
                    <FieldLabel required>Medio de pago</FieldLabel>
                    <AppSelect
                      value={entryForm.paymentType}
                      options={PAYMENT_TYPE_OPTIONS}
                      onValueChange={(paymentType) =>
                        setEntryForm((current) => ({
                          ...current,
                          paymentType,
                          bank: paymentType === 'bank' ? current.bank : '',
                        }))
                      }
                    />
                  </div>
                  <div>
                    <FieldLabel>Banco</FieldLabel>
                    <AppSelect
                      value={entryForm.bank || 'none'}
                      options={[
                        { value: 'none', label: 'Seleccionar banco' },
                        ...BANK_OPTIONS,
                      ]}
                      disabled={entryForm.paymentType !== 'bank'}
                      onValueChange={(bank) =>
                        setEntryForm((current) => ({
                          ...current,
                          bank: bank === 'none' ? '' : bank,
                        }))
                      }
                    />
                  </div>
                  <label className="sm:col-span-2">
                    <FieldLabel required>Concepto</FieldLabel>
                    <input
                      className={FIELD_CLASS}
                      name="concept"
                      value={entryForm.concept}
                      placeholder="Ej. Compra de insumos / Ingreso extra"
                      onChange={handleEntryFormChange}
                      required
                    />
                  </label>
                  <div className="sm:col-span-2">
                    <FieldLabel>Fecha</FieldLabel>
                    <DatePicker
                      value={entryForm.occurredOn}
                      placeholder="dd/mm/aaaa"
                      onChange={(occurredOn) =>
                        setEntryForm((current) => ({
                          ...current,
                          occurredOn: occurredOn || selectedDate,
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="mt-5">
                  <ConfirmActions
                    variant="dialog"
                    cancelLabel="Cancelar"
                    confirmLabel="Guardar"
                    isSubmitting={isSubmitting}
                    onCancel={() => setIsEntryDialogOpen(false)}
                    onConfirm={handleCreateEntry}
                  />
                </div>
              </form>
            </AppDialog>

            <AppDialog
              open={isCloseDialogOpen}
              title="Cerrar caja del dia"
              onOpenChange={setIsCloseDialogOpen}
            >
              <div className="mt-5 grid gap-5">
                <div className="rounded-3xl bg-amber-500/10 px-5 py-4 text-sm text-amber-950 dark:text-amber-100">
                  <p className="font-bold">
                    ¿Confirmas el cierre de caja del {selectedDate}?
                  </p>
                  <p className="mt-2 leading-relaxed">
                    Se guardara un snapshot con los ingresos, gastos y medios de
                    pago del dia. Esta accion no se puede deshacer desde la
                    aplicacion.
                  </p>
                  <ul className="mt-3 space-y-1 font-semibold tabular-nums">
                    <li>Ingresos: {formatMoney(summary.incomeTotal)}</li>
                    <li>Gastos: {formatMoney(summary.expenseTotal)}</li>
                    <li>Neto: {formatMoney(summary.netTotal)}</li>
                  </ul>
                </div>
                <label>
                  <FieldLabel>Notas (opcional)</FieldLabel>
                  <textarea
                    className={`${FIELD_CLASS} min-h-24 resize-y`}
                    value={closeNotes}
                    onChange={(event) => setCloseNotes(event.target.value)}
                    placeholder="Observaciones del cierre..."
                  />
                </label>
                <ConfirmActions
                  variant="dialog"
                  cancelLabel="Cancelar"
                  confirmLabel="Cerrar caja"
                  isSubmitting={isSubmitting}
                  onCancel={() => setIsCloseDialogOpen(false)}
                  onConfirm={handleCloseCash}
                />
              </div>
            </AppDialog>

            <YesONo
              open={Boolean(deleteEntryTarget)}
              title="Eliminar movimiento"
              isSubmitting={isSubmitting}
              description="El gasto o ingreso general se eliminara de forma permanente."
              onConfirm={handleDeleteEntry}
              onOpenChange={(open) => {
                if (!open) {
                  setDeleteEntryTarget(null)
                }
              }}
            />
          </>
        }
      >
        <div className="mb-5 flex flex-wrap items-center gap-3">
          {isClosed ? (
            <CustomBadge color="green" label="Caja cerrada" />
          ) : (
            <CustomBadge color="amber" label="Caja abierta" />
          )}
          <div className="ml-auto flex flex-wrap gap-2">
            <AppButton
              type="button"
              variant="outline"
              effect="zoomIn"
              leftIcon={FaFilePdf}
              disabled={isLoading}
              onClick={() => setIsPdfOpen(true)}
              className="border-border font-bold text-black dark:text-white hover:bg-red-500/10 hover:text-red-700"
            >
              Ver PDF
            </AppButton>
            <AppButton
              type="button"
              variant="solid"
              disabled={isLoading || isClosed || isSubmitting}
              onClick={() => setIsCloseDialogOpen(true)}
            >
              Cerrar caja
            </AppButton>
          </div>
        </div>

        {isPdfOpen && pdfData ? (
          <Suspense fallback={null}>
            <CajaPdfPreviewDialog
              open={isPdfOpen}
              onOpenChange={setIsPdfOpen}
              data={pdfData}
            />
          </Suspense>
        ) : null}

        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <SummaryCard label="Ingresos" value={formatMoney(summary.incomeTotal)} tone="good" />
          <SummaryCard label="Gastos" value={formatMoney(summary.expenseTotal)} tone="bad" />
          <SummaryCard label="Neto" value={formatMoney(summary.netTotal)} />
          <SummaryCard label="Efectivo" value={formatMoney(summary.cashTotal)} tone="muted" />
          <SummaryCard label="Banco" value={formatMoney(summary.bankTotal)} tone="muted" />
        </div>

        {isLoading ? (
          <div className="flex justify-center rounded-3xl bg-background px-5 py-8">
            <Loader
              label="Cargando caja..."
              className="text-foreground/55 [&>svg]:text-black/70 dark:[&>svg]:text-white/70"
            />
          </div>
        ) : filteredMovements.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-background px-5 py-10 text-center">
            <p className="font-semibold text-foreground">Sin movimientos</p>
            <p className="mt-2 text-sm text-foreground/55">
              No hay abonos, ventas ni gastos/ingresos para el{' '}
              {formatDateLabel(selectedDate)}. Los abonos se listan en la fecha
              en que se registraron.
            </p>
            {otherAbonoDates.length > 0 ? (
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <span className="text-xs text-foreground/45">
                  Hay abonos en:
                </span>
                {otherAbonoDates.map((dateKey) => (
                  <AppButton
                    key={dateKey}
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-xl px-3 py-1.5 text-xs font-semibold"
                    onClick={() => setSelectedDate(dateKey)}
                  >
                    {formatDateLabel(dateKey)}
                  </AppButton>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <Table
            footer={
              <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
                pageSize={pageSize}
                onPageSizeChange={setPageSize}
              />
            }
          >
            <TableHeader>
              <TableRow className="hover:bg-background">
                <TableHead>Hora</TableHead>
                <TableHead>Descripcion</TableHead>
                <TableHead>Medio</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Tipo</TableHead>
                {isAdmin ? <TableHead className="text-right">Acciones</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleMovements.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <p className="text-sm font-semibold tabular-nums">
                      {formatTime(row.occurredAt)}
                    </p>
                  </TableCell>
                  <TableCell>
                    <p className="font-bold text-foreground">{row.description}</p>
                    {row.clientName ? (
                      <p className="text-xs text-foreground/55">{row.clientName}</p>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <p className="text-sm font-semibold">
                      {row.paymentTypeLabel}
                      {row.paymentType === 'bank' && row.bankLabel !== '—'
                        ? ` · ${row.bankLabel}`
                        : ''}
                    </p>
                  </TableCell>
                  <TableCell>
                    <p
                      className={`font-bold tabular-nums ${
                        row.kind === 'expense'
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-emerald-700 dark:text-emerald-300'
                      }`}
                    >
                      {row.kind === 'expense' ? '- ' : ''}
                      {formatMoney(row.amount)}
                    </p>
                  </TableCell>
                  <TableCell>
                    <CustomBadge
                      color={row.kind === 'expense' ? 'red' : 'green'}
                      label={row.kind === 'expense' ? 'Gasto' : 'Ingreso'}
                    />
                  </TableCell>
                  {isAdmin ? (
                    <TableCell>
                      <div className="flex justify-end">
                        {row.source === 'manual' ? (
                          <ProfileActionButton
                            icon={TbTrashX}
                            label="Eliminar"
                            tooltip="Eliminar movimiento"
                            tone="red"
                            disabled={isSubmitting || isClosed}
                            onClick={() => setDeleteEntryTarget(row)}
                          />
                        ) : (
                          <span className="text-xs text-foreground/40">—</span>
                        )}
                      </div>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {isAdmin ? (
          <p className="mt-4 text-xs text-foreground/50">
            Como administrador puedes consultar y eliminar gastos e ingresos
            generales. Los abonos y ventas se reflejan automaticamente desde las
            ordenes.
          </p>
        ) : (
          <p className="mt-4 text-xs text-foreground/50">
            Los abonos y ventas de ordenes se reflejan automaticamente. Puedes
            registrar gastos o ingresos operativos y cerrar la caja del dia.
          </p>
        )}
      </DashboardListSection>
    </DashboardLayout>
  )
}

export default DashboardCajaPage
