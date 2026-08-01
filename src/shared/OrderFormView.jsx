import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { FaFilePdf } from 'react-icons/fa6'
import { IoAddCircle } from 'react-icons/io5'
import { TiUserAdd } from 'react-icons/ti'
import { TbTrashX } from 'react-icons/tb'
import DashboardLayout from '../components/layout/DashboardLayout'
import Loader from '../hooks/Loader'
import appToast from '../hooks/appToast'
import PageHeader from '../hooks/PageHeader'
import { useCachedData } from '../hooks/useCachedData'
import AppSelect from './select'
import AppButton from './AppButton'
import AppDialog from './dialog'
import ClientLookupInput from './ClientLookupInput'
import ConfirmActions from './ConfirmActions'
import DateTimePicker from './DateTimePicker'
import ProductLookupInput from './ProductLookupInput'
import {
  getScheduleIssueMessages,
  getScheduleIssues,
  splitScheduleValue,
} from './scheduleValidation'
import {
  applyClientToOrderForm,
  canQuickAddClientFromOrder,
  CLIENT_SEARCH_KEYS,
  getClientPayloadFromOrderForm,
  shouldAutoCreateClientFromOrder,
} from './clientOrderMap'
import {
  BANK_OPTIONS,
  createEmptyAbonoRow,
  createEmptyAbonos,
  formatAbonoDateTime,
  normalizeAbonoRows,
  PAYMENT_TYPE_OPTIONS,
  recalculateAbonoChain,
} from './orderAbonos'
import { buildOrderPdfData, PDF_PARTS_MAX_ROWS } from './orderPdfConstants'

const DatePicker = lazy(() => import('./DatePicker'))
const OrderChatPanel = lazy(() => import('./OrderChatPanel'))
const OrderPdfPreviewDialog = lazy(() => import('./OrderPdfPreviewDialog'))

const EMPTY_LIST = []
const dateFallback = (
  <div className="h-18 animate-pulse rounded-2xl bg-foreground/5" />
)
const chatFallback = (
  <div className="sticky top-6 flex h-[min(70vh,36rem)] items-center justify-center rounded-4xl border border-border bg-surface text-sm text-foreground/55">
    Cargando chat...
  </div>
)
import {
  SERVICE_CONDITION_OPTIONS,
  SERVICE_TYPE_OPTIONS,
} from './orderConstants'
import {
  applyProductToPartRow,
  createEmptyPartRow,
  getPartQuantityWarning,
  getPartStockWarning,
  getProductUsageFromParts,
  sanitizePartsAgainstProducts,
} from './productOrderMap'
import { getClients, createClient } from '../services/clientService'
import {
  getInventoryProducts,
  subscribeInventoryProductsChanges,
} from '../services/inventoryService'
import {
  INITIAL_ORDER_VALUES,
  createOrder,
  getOrderByNumber,
  getOrderFormValues,
  getTechnicians,
  subscribeOrderDiagnosisChanges,
  updateOrder,
} from '../services/orderService'
import { useAuthStore } from '../store/authStore'
import { invalidateUserCache } from '../store/dataCacheStore'
import { signOutUser } from '../utils/auth'

const FIELD_CLASS =
  'w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none focus:border-primary focus:bg-white dark:focus:bg-transparent/10 focus:ring-4 focus:ring-primary/20'

const NUMBER_FIELD_CLASS = `${FIELD_CLASS} no-spinner`

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

const modeConfig = {
  create: {
    title: 'Agregar Orden',
    description: 'Crea una nueva orden de servicio tecnico.',
    confirmLabel: 'Guardar Orden',
    successMessage: 'Orden creada correctamente.',
  },
  edit: {
    title: 'Editar Orden',
    description: 'Actualiza los datos de la orden seleccionada.',
    confirmLabel: 'Guardar cambios',
    successMessage: 'Orden actualizada correctamente.',
  },
}

function OrderFormView({ mode = 'create', orderId = null }) {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const [form, setForm] = useState(INITIAL_ORDER_VALUES)
  const [orderUuid, setOrderUuid] = useState(null)
  /** Stock already deducted for this order (edit mode); used so validation allows keeping current qty. */
  const [reservedPartsUsage, setReservedPartsUsage] = useState({})
  const [technicianOptions, setTechnicianOptions] = useState([])
  const [isLoadingOrder, setIsLoadingOrder] = useState(mode === 'edit')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isQuickAddingClient, setIsQuickAddingClient] = useState(false)
  const [isPdfOpen, setIsPdfOpen] = useState(false)
  const [isChatDeferred, setIsChatDeferred] = useState(false)
  const [isScheduleTimeDialogOpen, setIsScheduleTimeDialogOpen] = useState(false)
  const config = modeConfig[mode] ?? modeConfig.create
  const isWarranty = form.serviceCondition === 'warranty'
  const isBilled = form.serviceCondition === 'billed'
  const userId = user?.id
  const isChatReady = !isLoadingOrder && isChatDeferred

  const { data: clientsData, refetch: refetchClients } = useCachedData({
    cacheKey: 'clients',
    fetcher: getClients,
    enabled: Boolean(userId),
  })
  const clients = useMemo(
    () => (Array.isArray(clientsData) ? clientsData : EMPTY_LIST),
    [clientsData],
  )

  const canQuickAddClient = useMemo(
    () => canQuickAddClientFromOrder(form, clients),
    [clients, form],
  )

  const { data: productsData } = useCachedData({
    cacheKey: 'inventory-products',
    fetcher: getInventoryProducts,
    enabled: Boolean(userId),
    refetchOnFocus: true,
    subscribe: subscribeInventoryProductsChanges,
  })
  const products = useMemo(
    () => (Array.isArray(productsData) ? productsData : EMPTY_LIST),
    [productsData],
  )

  const selectedTechnician = useMemo(() => {
    if (!form.technicianId) {
      return null
    }

    return (
      technicianOptions.find((option) => option.value === form.technicianId) ||
      null
    )
  }, [form.technicianId, technicianOptions])

  const technicianName = selectedTechnician?.label || ''
  const technicianDocumentNumber = selectedTechnician?.identification || ''

  // Only build PDF payload when the dialog is open.
  const pdfData = useMemo(() => {
    if (!isPdfOpen) {
      return null
    }

    return buildOrderPdfData({
      form,
      orderNumber: mode === 'edit' ? orderId : '',
      technicianName,
      technicianDocumentNumber,
      generatedBy:
        [user?.name, user?.lastName].filter(Boolean).join(' ').trim() ||
        user?.nickname ||
        '',
    })
  }, [
    form,
    isPdfOpen,
    mode,
    orderId,
    technicianDocumentNumber,
    technicianName,
    user,
  ])

  // Mount TipTap chat after the form paints to keep navigation clicks responsive.
  useEffect(() => {
    if (isLoadingOrder) {
      return undefined
    }

    let timeoutId
    const idleId = window.requestIdleCallback
      ? window.requestIdleCallback(() => setIsChatDeferred(true), { timeout: 400 })
      : null

    if (idleId == null) {
      timeoutId = window.setTimeout(() => setIsChatDeferred(true), 120)
    }

    return () => {
      if (idleId != null && window.cancelIdleCallback) {
        window.cancelIdleCallback(idleId)
      }
      if (timeoutId != null) {
        window.clearTimeout(timeoutId)
      }
    }
  }, [isLoadingOrder])

  useEffect(() => {
    let cancelled = false

    async function loadTechnicians() {
      try {
        const options = await getTechnicians()

        if (!cancelled) {
          setTechnicianOptions(options)
        }
      } catch (error) {
        if (!cancelled) {
          appToast.danger(
            getErrorMessage(error, 'No se pudieron cargar los tecnicos.'),
          )
        }
      }
    }

    loadTechnicians()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadOrder() {
      if (mode !== 'edit') {
        setForm({
          ...INITIAL_ORDER_VALUES,
          abonos: createEmptyAbonos(1),
        })
        setOrderUuid(null)
        setReservedPartsUsage({})
        setIsLoadingOrder(false)
        return
      }

      setIsLoadingOrder(true)

      try {
        const order = await getOrderByNumber(orderId)

        if (cancelled) {
          return
        }

        if (!order) {
          appToast.warning('No se encontro la orden.')
          navigate({ to: '/dashboard/orders' })
          return
        }

        const formValues = getOrderFormValues(order)
        setForm(formValues)
        setReservedPartsUsage(getProductUsageFromParts(formValues.parts))
        setOrderUuid(order.uuid)
      } catch (error) {
        if (cancelled) {
          return
        }

        appToast.danger(getErrorMessage(error, 'No se pudo cargar la orden.'))
        navigate({ to: '/dashboard/orders' })
      } finally {
        if (!cancelled) {
          setIsLoadingOrder(false)
        }
      }
    }

    loadOrder()

    return () => {
      cancelled = true
    }
  }, [mode, orderId, navigate])

  // Keep diagnosis in sync when the assigned technician saves from another session/tab.
  useEffect(() => {
    if (mode !== 'edit' || !orderUuid) {
      return undefined
    }

    return subscribeOrderDiagnosisChanges(orderUuid, (diagnosis) => {
      setForm((currentForm) => {
        if (currentForm.diagnosis === diagnosis) {
          return currentForm
        }

        return { ...currentForm, diagnosis }
      })
    })
  }, [mode, orderUuid])

  async function handleLogout() {
    await signOutUser()
    logout()
    navigate({ to: '/' })
  }

  function handleChange(event) {
    const { name, value } = event.target
    setForm((currentForm) => ({ ...currentForm, [name]: value }))
  }

  function handleSelectClient(client) {
    setForm((currentForm) => applyClientToOrderForm(currentForm, client))
  }

  async function handleQuickAddClient() {
    if (!canQuickAddClientFromOrder(form, clients)) {
      appToast.warning(
        'Completa nombre, cedula, telefono, correo y direccion con datos que no existan en clientes.',
      )
      return
    }

    const payload = getClientPayloadFromOrderForm(form)

    setIsQuickAddingClient(true)

    try {
      const created = await appToast.promise(
        createClient(payload, { createdBy: user?.id }),
        {
          loading: 'Agregando cliente...',
          success: 'Cliente agregado correctamente.',
          error: (error) =>
            getErrorMessage(error, 'No se pudo agregar el cliente.'),
        },
      )

      if (user?.id) {
        invalidateUserCache(user.id, 'clients')
      }

      await refetchClients({ silent: true, force: true })
      setForm((currentForm) => applyClientToOrderForm(currentForm, created))
    } catch {
      // Toast already shown by appToast.promise
    } finally {
      setIsQuickAddingClient(false)
    }
  }

  function handlePartChange(index, field, value) {
    setForm((currentForm) => {
      const parts = [...(currentForm.parts || [])]
      const currentRow = parts[index] || createEmptyPartRow()
      const nextRow = { ...currentRow, [field]: value }

      if (field === 'part' && !String(value ?? '').trim()) {
        nextRow.productId = ''
        nextRow.stock = null
      }

      parts[index] = nextRow
      return { ...currentForm, parts }
    })
  }

  function handleSelectPartProduct(index, product) {
    setForm((currentForm) => {
      const parts = [...(currentForm.parts || [])]
      const currentRow = parts[index] || createEmptyPartRow()
      parts[index] = applyProductToPartRow(currentRow, product)
      return { ...currentForm, parts }
    })
  }

  function handleAddPartRow() {
    setForm((currentForm) => {
      const parts = [...(currentForm.parts || [])]
      if (parts.length >= PDF_PARTS_MAX_ROWS) {
        appToast.warning(`Maximo ${PDF_PARTS_MAX_ROWS} repuestos por orden.`)
        return currentForm
      }

      return {
        ...currentForm,
        parts: [...parts, createEmptyPartRow()],
      }
    })
  }

  function handleRemovePartRow(index) {
    setForm((currentForm) => {
      const parts = [...(currentForm.parts || [])]
      if (parts.length <= 1) {
        parts[0] = createEmptyPartRow()
        return { ...currentForm, parts }
      }

      parts.splice(index, 1)
      return { ...currentForm, parts }
    })
  }

  function handleAbonoChange(index, field, value) {
    setForm((currentForm) => {
      const abonos = [...(currentForm.abonos || [])]
      const currentRow = abonos[index] || createEmptyAbonoRow()
      const nextRow = { ...currentRow, [field]: value }

      if (field === 'paymentType' && value !== 'bank') {
        nextRow.bank = ''
        nextRow.bankOther = ''
      }

      if (field === 'bank' && value !== 'otro') {
        nextRow.bankOther = ''
      }

      abonos[index] = nextRow
      return {
        ...currentForm,
        abonos: recalculateAbonoChain(abonos),
      }
    })
  }

  function handleAddAbonoRow() {
    setForm((currentForm) => {
      const abonos = [...(currentForm.abonos || [])]
      const previous = abonos[abonos.length - 1]
      const previousBalance = String(previous?.balance ?? '').trim()
      const nextTotal =
        previousBalance !== '' && Number.isFinite(Number(previousBalance))
          ? previousBalance
          : '0'

      return {
        ...currentForm,
        abonos: recalculateAbonoChain([
          ...abonos,
          createEmptyAbonoRow({ totalPrice: nextTotal }),
        ]),
      }
    })
  }

  function handleRemoveAbonoRow(index) {
    setForm((currentForm) => {
      const abonos = [...(currentForm.abonos || [])]
      if (abonos.length <= 1) {
        return {
          ...currentForm,
          abonos: recalculateAbonoChain([createEmptyAbonoRow()]),
        }
      }

      abonos.splice(index, 1)
      return {
        ...currentForm,
        abonos: recalculateAbonoChain(abonos),
      }
    })
  }

  function handleCancel() {
    navigate({ to: '/dashboard/orders' })
  }

  async function handleSubmit(event) {
    event?.preventDefault?.()

    if (
      !form.clientName.trim() ||
      !form.device.trim() ||
      !form.serviceType ||
      !form.serviceCondition
    ) {
      appToast.warning(
        'Cliente, equipo, condicion y tipo de servicio son obligatorios.',
      )
      return
    }

    if (isBilled && String(form.serviceCost).trim() === '') {
      appToast.warning('El costo del servicio es obligatorio en ordenes facturadas.')
      return
    }

    const sanitizedParts = sanitizePartsAgainstProducts(form.parts, products)
    const stockOptions = {
      reservedUsage: reservedPartsUsage,
      parts: sanitizedParts,
    }

    const invalidQuantity = sanitizedParts.find(
      (row) => getPartQuantityWarning(row) === 'Cantidad no valida',
    )

    if (invalidQuantity) {
      appToast.warning(
        `Cantidad no valida en "${invalidQuantity.part || 'repuesto'}". Debe ser mayor a 0.`,
      )
      return
    }

    const stockBlock = sanitizedParts.find(
      (row) =>
        getPartStockWarning(row, products, stockOptions) ===
        'Supera el stock actual',
    )

    if (stockBlock) {
      appToast.warning(
        `Supera el stock actual en "${stockBlock.part || 'repuesto'}".`,
      )
      return
    }

    if (form.scheduleEnabled) {
      const { date, time } = splitScheduleValue(form.scheduledAt)
      const scheduleIssues = getScheduleIssues(form.scheduledAt)

      if (!time) {
        setIsScheduleTimeDialogOpen(true)
        return
      }

      if (!date || scheduleIssues.includes('missing-date')) {
        appToast.warning(
          'Indica la fecha de programacion para el tecnico, o desactiva la programacion.',
        )
        return
      }

      const pastMessages = getScheduleIssueMessages(
        scheduleIssues.filter(
          (issue) => issue === 'past-date' || issue === 'past-time',
        ),
      )

      if (pastMessages.length > 0) {
        appToast.warning(pastMessages[0])
        return
      }
    }

    const payload = {
      clientName: form.clientName.trim(),
      clientPhone: form.clientPhone.trim(),
      clientEmail: form.clientEmail.trim(),
      clientAddress: form.clientAddress.trim(),
      device: form.device.trim(),
      brand: form.brand.trim(),
      model: form.model.trim(),
      serialNumber: form.serialNumber.trim(),
      serviceType: form.serviceType,
      serviceCondition: form.serviceCondition,
      technicianId: form.technicianId,
      scheduledAt: form.scheduleEnabled ? form.scheduledAt : '',
      issue: '',
      serviceCost: form.serviceCost,
      previousServiceNotes: form.previousServiceNotes.trim(),
      documentNumber: form.documentNumber.trim(),
      externalOrderNumber: form.externalOrderNumber.trim(),
      deliveryDate: form.deliveryDate,
      repairDate: form.repairDate,
      purchaseDate: form.purchaseDate,
      symptom: '',
      parts: sanitizedParts,
      abonos: normalizeAbonoRows(form.abonos, {
        minRows: 1,
        stampMissingDates: true,
      }),
    }

    setIsSubmitting(true)

    try {
      if (shouldAutoCreateClientFromOrder(form, clients)) {
        try {
          await createClient(getClientPayloadFromOrderForm(form), {
            createdBy: user?.id,
          })

          if (user?.id) {
            invalidateUserCache(user.id, 'clients')
          }

          await refetchClients({ silent: true, force: true })
        } catch (clientError) {
          const message = String(clientError?.message ?? '')
          // Another session may have created the same client; continue with the order.
          if (!message.includes('Ya existe un cliente')) {
            appToast.danger(
              getErrorMessage(
                clientError,
                'No se pudo registrar el cliente automaticamente.',
              ),
            )
            throw clientError
          }
        }
      }

      if (mode === 'edit') {
        await appToast.promise(updateOrder(orderId, payload), {
          loading: 'Actualizando orden...',
          success: config.successMessage,
          error: (error) => getErrorMessage(error, 'No se pudo actualizar la orden.'),
        })
      } else {
        await appToast.promise(
          createOrder(payload, { createdBy: user?.id }),
          {
            loading: 'Creando orden...',
            success: config.successMessage,
            error: (error) => getErrorMessage(error, 'No se pudo crear la orden.'),
          },
        )
      }

      if (user?.id) {
        invalidateUserCache(user.id, 'orders')
        invalidateUserCache(user.id, 'inventory-products')
        invalidateUserCache(user.id, 'clients')
      }

      navigate({ to: '/dashboard/orders' })
    } catch (error) {
      // Stock may have changed due to a concurrent order; refresh inventory UI.
      if (
        user?.id &&
        String(error?.message ?? '').includes('Stock insuficiente')
      ) {
        invalidateUserCache(user.id, 'inventory-products')
      }

      if (
        user?.id &&
        String(error?.message ?? '').includes('cliente')
      ) {
        invalidateUserCache(user.id, 'clients')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <DashboardLayout user={user} onLogout={handleLogout}>
      <div className="mx-auto max-w-7xl">
        <PageHeader title="Gestion de ordenes" />

        <section className="mt-8 rounded-4xl border border-border bg-surface px-5 py-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="font-display text-2xl font-semibold text-foreground md:text-3xl">
                {mode === 'edit' && orderId
                  ? `${config.title} #${orderId}`
                  : config.title}
              </h1>
              <p className="mt-1 text-sm text-foreground/55">{config.description}</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <AppButton
                type="button"
                variant="outline"
                effect="zoomIn"
                leftIcon={FaFilePdf}
                disabled={isLoadingOrder}
                onClick={() => setIsPdfOpen(true)}
                className="border-border font-bold text-black dark:text-white hover:bg-red-500/10 hover:text-red-700"
              >
                Ver PDF
              </AppButton>
              <ConfirmActions
                cancelLabel="Cancelar"
                confirmLabel={config.confirmLabel}
                isSubmitting={isSubmitting || isLoadingOrder}
                onCancel={handleCancel}
                onConfirm={handleSubmit}
              />
            </div>
          </div>
        </section>

        {isPdfOpen && pdfData ? (
          <Suspense fallback={null}>
            <OrderPdfPreviewDialog
              open={isPdfOpen}
              onOpenChange={setIsPdfOpen}
              data={pdfData}
            />
          </Suspense>
        ) : null}

        <AppDialog
          open={isScheduleTimeDialogOpen}
          title="Hora de programacion pendiente"
          onOpenChange={setIsScheduleTimeDialogOpen}
        >
          <div className="mt-5 grid gap-5">
            <div className="rounded-3xl bg-amber-500/10 px-5 py-4 text-sm text-amber-950 dark:text-amber-100">
              <p className="font-bold">
                No se puede guardar la orden con la programacion incompleta.
              </p>
              <p className="mt-2 leading-relaxed">
                Activaste la programacion para el tecnico, pero no se definio una
                hora. Para continuar, indica la hora en la que la orden debe
                quedar disponible para el tecnico, o desactiva la programacion
                si deseas que la asignacion sea inmediata al guardar.
              </p>
            </div>
            <div className="flex justify-end">
              <AppButton
                type="button"
                variant="solid"
                effect="zoomIn"
                onClick={() => setIsScheduleTimeDialogOpen(false)}
              >
                Entendido
              </AppButton>
            </div>
          </div>
        </AppDialog>

        {isLoadingOrder ? (
          <div className="mt-6 flex justify-center rounded-4xl bg-surface px-5 py-10 shadow-sm ring-1 ring-border">
            <Loader
              label="Cargando orden..."
              className="text-foreground/55 [&>svg]:text-black/70 dark:[&>svg]:text-white/70"
            />
          </div>
        ) : (
          <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,380px)]">
            <div className="space-y-6">
            <form
              className="rounded-4xl bg-surface p-6 shadow-sm ring-1 ring-border"
              onSubmit={handleSubmit}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2 rounded-2xl border border-border p-4">
                  <DateTimePicker
                    label="Programar para el tecnico"
                    value={form.scheduledAt}
                    enabled={form.scheduleEnabled}
                    datePlaceholder="dd/mm/aaaa"
                    timePlaceholder="h:mm a. m."
                    hint="Activa el checkbox para programar fecha y hora. Si esta desactivado, la orden aparece de inmediato al tecnico."
                    onEnabledChange={(scheduleEnabled) =>
                      setForm((currentForm) => ({
                        ...currentForm,
                        scheduleEnabled,
                      }))
                    }
                    onChange={(scheduledAt) =>
                      setForm((currentForm) => ({
                        ...currentForm,
                        scheduledAt,
                      }))
                    }
                  />
                </div>

                <div className="md:col-span-2 grid gap-4 md:grid-cols-2">
                  <div>
                    <FieldLabel>Tecnico asignado</FieldLabel>
                    <AppSelect
                      value={form.technicianId || 'none'}
                      options={[
                        { value: 'none', label: 'Sin asignar' },
                        ...technicianOptions,
                      ]}
                      placeholder="Seleccionar tecnico"
                      onValueChange={(technicianId) =>
                        setForm((currentForm) => ({
                          ...currentForm,
                          technicianId:
                            technicianId === 'none' ? '' : technicianId,
                        }))
                      }
                    />
                  </div>
                </div>

                <div>
                  <FieldLabel required>Condicion del servicio</FieldLabel>
                  <AppSelect
                    value={form.serviceType || undefined}
                    options={SERVICE_TYPE_OPTIONS}
                    placeholder="Seleccionar condicion"
                    onValueChange={(serviceType) =>
                      setForm((currentForm) => ({ ...currentForm, serviceType }))
                    }
                  />
                </div>

                <div>
                  <FieldLabel required>Tipo de servicio</FieldLabel>
                  <AppSelect
                    value={form.serviceCondition || undefined}
                    options={SERVICE_CONDITION_OPTIONS}
                    placeholder="Seleccionar tipo"
                    onValueChange={(serviceCondition) =>
                      setForm((currentForm) => ({
                        ...currentForm,
                        serviceCondition,
                      }))
                    }
                  />
                </div>

                <ClientLookupInput
                  label="Nombre del cliente"
                  required
                  value={form.clientName}
                  placeholder="Buscar por nombre..."
                  clients={clients}
                  searchKeys={CLIENT_SEARCH_KEYS}
                  onValueChange={(clientName) =>
                    setForm((currentForm) => ({ ...currentForm, clientName }))
                  }
                  onSelectClient={handleSelectClient}
                />

                <ClientLookupInput
                  label="Cc. Cedula"
                  value={form.documentNumber}
                  placeholder="Buscar por cedula..."
                  clients={clients}
                  searchKeys={CLIENT_SEARCH_KEYS}
                  onValueChange={(documentNumber) =>
                    setForm((currentForm) => ({
                      ...currentForm,
                      documentNumber,
                    }))
                  }
                  onSelectClient={handleSelectClient}
                />

                <label>
                  <FieldLabel>Telefono</FieldLabel>
                  <input
                    className={FIELD_CLASS}
                    name="clientPhone"
                    value={form.clientPhone}
                    placeholder="Numero de contacto"
                    onChange={handleChange}
                  />
                </label>

                <label>
                  <FieldLabel>Direccion</FieldLabel>
                  <input
                    className={FIELD_CLASS}
                    name="clientAddress"
                    value={form.clientAddress}
                    placeholder="Direccion del cliente"
                    onChange={handleChange}
                  />
                </label>

                <label>
                  <FieldLabel>Correo</FieldLabel>
                  <input
                    className={FIELD_CLASS}
                    name="clientEmail"
                    type="email"
                    value={form.clientEmail}
                    placeholder="Correo del cliente"
                    onChange={handleChange}
                  />
                </label>

                <div className="flex flex-col justify-end">
                  <span className="mb-1 hidden text-sm font-bold sm:block sm:invisible">
                    &nbsp;
                  </span>
                  <AppButton
                    type="button"
                    variant="outline"
                    size="sm"
                    leftIcon={TiUserAdd}
                    className={`h-12.5 w-full rounded-2xl border-dashed ${
                      canQuickAddClient
                        ? ''
                        : 'border-border/50 text-foreground/35'
                    }`}
                    isLoading={isQuickAddingClient}
                    disabled={
                      !canQuickAddClient ||
                      isQuickAddingClient ||
                      isSubmitting
                    }
                    tooltip={
                      canQuickAddClient
                        ? 'Agregar cliente a la base de datos'
                        : 'Completa los datos de un cliente nuevo para activar'
                    }
                    onClick={handleQuickAddClient}
                  >
                    Guardar cliente
                  </AppButton>
                </div>

                <label>
                  <FieldLabel required>Equipo</FieldLabel>
                  <input
                    className={FIELD_CLASS}
                    name="device"
                    value={form.device}
                    placeholder="Celular, laptop, TV..."
                    onChange={handleChange}
                    required
                  />
                </label>

                <label>
                  <FieldLabel>Marca</FieldLabel>
                  <input
                    className={FIELD_CLASS}
                    name="brand"
                    value={form.brand}
                    placeholder="Samsung, Apple, Lenovo..."
                    onChange={handleChange}
                  />
                </label>

                <label>
                  <FieldLabel>Modelo</FieldLabel>
                  <input
                    className={FIELD_CLASS}
                    name="model"
                    value={form.model}
                    placeholder="Modelo del equipo"
                    onChange={handleChange}
                  />
                </label>

                <label>
                  <FieldLabel>Serie del producto</FieldLabel>
                  <input
                    className={FIELD_CLASS}
                    name="serialNumber"
                    value={form.serialNumber}
                    placeholder="Serie unica del equipo"
                    onChange={handleChange}
                  />
                </label>

                <label>
                  <FieldLabel>Orden externa (fabricante)</FieldLabel>
                  <input
                    className={FIELD_CLASS}
                    name="externalOrderNumber"
                    value={form.externalOrderNumber}
                    placeholder="Ej. Sansu / fabricante"
                    onChange={handleChange}
                  />
                </label>

                <Suspense fallback={dateFallback}>
                  <DatePicker
                    label="Fecha de entrega"
                    value={form.deliveryDate}
                    placeholder="Seleccionar fecha"
                    onChange={(deliveryDate) =>
                      setForm((currentForm) => ({
                        ...currentForm,
                        deliveryDate,
                      }))
                    }
                  />
                </Suspense>

                <Suspense fallback={dateFallback}>
                  <DatePicker
                    label="Fecha de reparacion"
                    value={form.repairDate}
                    placeholder="Seleccionar fecha"
                    onChange={(repairDate) =>
                      setForm((currentForm) => ({
                        ...currentForm,
                        repairDate,
                      }))
                    }
                  />
                </Suspense>

                <Suspense fallback={dateFallback}>
                  <DatePicker
                    label="Fecha de compra"
                    value={form.purchaseDate}
                    placeholder="Seleccionar fecha"
                    onChange={(purchaseDate) =>
                      setForm((currentForm) => ({
                        ...currentForm,
                        purchaseDate,
                      }))
                    }
                  />
                </Suspense>

                <label className="md:col-span-2">
                  <FieldLabel>Diagnostico</FieldLabel>
                  <textarea
                    className={`${FIELD_CLASS} min-h-28 resize-y cursor-default bg-foreground/5 text-foreground/80`}
                    name="diagnosis"
                    value={form.diagnosis}
                    placeholder="El tecnico asignado completa el diagnostico"
                    readOnly
                    tabIndex={0}
                  />
                  <p className="mt-1.5 text-xs text-foreground/50">
                    Solo el tecnico asignado puede editar el diagnostico desde la
                    vista de la orden.
                  </p>
                </label>

                {isBilled ? (
                  <label>
                    <FieldLabel required>Costo del servicio</FieldLabel>
                    <input
                      className={FIELD_CLASS}
                      name="serviceCost"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.serviceCost}
                      placeholder="0.00"
                      onChange={handleChange}
                      required
                    />
                  </label>
                ) : null}

                {isWarranty ? (
                  <label className={isBilled ? '' : 'md:col-span-2'}>
                    <FieldLabel>Antecedentes de servicios anteriores</FieldLabel>
                    <textarea
                      className={`${FIELD_CLASS} min-h-28 resize-y`}
                      name="previousServiceNotes"
                      value={form.previousServiceNotes}
                      placeholder="Historial relevante si es garantia"
                      onChange={handleChange}
                    />
                  </label>
                ) : null}

                <div className="md:col-span-2">
                  <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                    <FieldLabel>Repuestos</FieldLabel>
                    <AppButton
                      type="button"
                      size="sm"
                      variant="outline"
                      leftIcon={IoAddCircle}
                      className="rounded-xl px-3 py-1.5 text-xs font-semibold"
                      onClick={handleAddPartRow}
                    >
                      Anadir repuesto
                    </AppButton>
                  </div>
                  <div className="mt-1 space-y-3">
                    {(form.parts || []).map((row, index) => {
                      const stockWarning = getPartStockWarning(row, products, {
                        reservedUsage: reservedPartsUsage,
                        parts: form.parts,
                      })

                      return (
                        <div
                          key={`part-row-${index}`}
                          className="space-y-1.5 rounded-xl bg-background/60 p-2 ring-1 ring-border/60"
                        >
                          <div className="grid items-end gap-2 md:grid-cols-[minmax(0,1.4fr)_minmax(0,0.7fr)_minmax(0,1.4fr)_auto]">
                            <div>
                              <FieldLabel>Producto</FieldLabel>
                              <ProductLookupInput
                                value={row.part}
                                placeholder="Parte / Producto"
                                products={products}
                                onValueChange={(value) =>
                                  handlePartChange(index, 'part', value)
                                }
                                onSelectProduct={(product) =>
                                  handleSelectPartProduct(index, product)
                                }
                              />
                            </div>
                            <div>
                              <FieldLabel>Cantidad</FieldLabel>
                              <input
                                className={NUMBER_FIELD_CLASS}
                                value={row.quantity}
                                placeholder="Cantidad"
                                type="number"
                                min="0"
                                step="1"
                                onChange={(event) =>
                                  handlePartChange(
                                    index,
                                    'quantity',
                                    event.target.value,
                                  )
                                }
                              />
                            </div>
                            <div>
                              <FieldLabel>Descripcion</FieldLabel>
                              <input
                                className={FIELD_CLASS}
                                value={row.description}
                                placeholder="Descripcion"
                                onChange={(event) =>
                                  handlePartChange(
                                    index,
                                    'description',
                                    event.target.value,
                                  )
                                }
                              />
                            </div>
                            <AppButton
                              type="button"
                              size="icon"
                              variant="outline"
                              icon={TbTrashX}
                              className="size-11 shrink-0 rounded-2xl text-red-500"
                              tooltip="Quitar fila"
                              aria-label="Quitar fila de repuesto"
                              onClick={() => handleRemovePartRow(index)}
                            />
                          </div>
                          {stockWarning ? (
                            <p
                              className={`px-1 text-xs font-semibold ${
                                stockWarning === 'Cantidad no valida'
                                  ? 'text-red-600 dark:text-red-400'
                                  : 'text-amber-700 dark:text-amber-300'
                              }`}
                            >
                              {stockWarning}
                            </p>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </form>

            <section className="rounded-4xl bg-surface p-6 shadow-sm ring-1 ring-border">
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <FieldLabel>Abonos</FieldLabel>
                <AppButton
                  type="button"
                  size="sm"
                  variant="outline"
                  leftIcon={IoAddCircle}
                  className="rounded-xl px-3 py-1.5 text-xs font-semibold"
                  onClick={handleAddAbonoRow}
                >
                  Anadir abono
                </AppButton>
              </div>
              <div className="mt-1 space-y-3">
                {(form.abonos || []).map((row, index) => {
                  const isBankPayment = row.paymentType === 'bank'
                  const isOtherBank = isBankPayment && row.bank === 'otro'
                  const showRegisteredAt =
                    mode === 'edit' && Boolean(String(row.registeredAt ?? '').trim())

                  return (
                    <div
                      key={`abono-row-${index}-${row.registeredAt || index}`}
                      className="space-y-1.5 rounded-xl bg-background/60 p-2 ring-1 ring-border/60"
                    >
                      <div className="grid items-end gap-2 md:grid-cols-[minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,1.1fr)_auto]">
                        <div>
                          <FieldLabel>Precio total</FieldLabel>
                          <input
                            className={
                              index > 0
                                ? `${NUMBER_FIELD_CLASS} cursor-default bg-foreground/5 text-foreground/80`
                                : NUMBER_FIELD_CLASS
                            }
                            value={row.totalPrice}
                            placeholder="Precio total"
                            type="number"
                            min="0"
                            step="0.01"
                            readOnly={index > 0}
                            tabIndex={index > 0 ? -1 : undefined}
                            onChange={(event) =>
                              handleAbonoChange(
                                index,
                                'totalPrice',
                                event.target.value,
                              )
                            }
                          />
                        </div>
                        <div>
                          <FieldLabel>Abono</FieldLabel>
                          <input
                            className={NUMBER_FIELD_CLASS}
                            value={row.amount}
                            placeholder="Abono"
                            type="number"
                            min="0"
                            step="0.01"
                            onChange={(event) =>
                              handleAbonoChange(
                                index,
                                'amount',
                                event.target.value,
                              )
                            }
                          />
                        </div>
                        <div>
                          <FieldLabel>Saldo</FieldLabel>
                          <input
                            className={`${FIELD_CLASS} cursor-default bg-foreground/5 text-foreground/80`}
                            value={row.balance}
                            placeholder="Saldo"
                            type="text"
                            readOnly
                            tabIndex={0}
                            aria-label="Saldo"
                          />
                        </div>
                        <div>
                          <FieldLabel>Tipo de pago</FieldLabel>
                          <AppSelect
                            value={row.paymentType || 'none'}
                            options={[
                              { value: 'none', label: 'Tipo de pago' },
                              ...PAYMENT_TYPE_OPTIONS,
                            ]}
                            placeholder="Tipo de pago"
                            onValueChange={(paymentType) =>
                              handleAbonoChange(
                                index,
                                'paymentType',
                                paymentType === 'none' ? '' : paymentType,
                              )
                            }
                          />
                        </div>
                        <div>
                          <FieldLabel>Banco</FieldLabel>
                          <AppSelect
                            value={row.bank || 'none'}
                            options={[
                              { value: 'none', label: 'Seleccionar banco' },
                              ...BANK_OPTIONS,
                            ]}
                            placeholder="Seleccionar banco"
                            disabled={!isBankPayment}
                            onValueChange={(bank) =>
                              handleAbonoChange(
                                index,
                                'bank',
                                bank === 'none' ? '' : bank,
                              )
                            }
                          />
                        </div>
                        <AppButton
                          type="button"
                          size="icon"
                          variant="outline"
                          icon={TbTrashX}
                          className="size-11 shrink-0 rounded-2xl text-red-500"
                          tooltip="Quitar abono"
                          aria-label="Quitar fila de abono"
                          onClick={() => handleRemoveAbonoRow(index)}
                        />
                      </div>
                      {isOtherBank ? (
                        <input
                          className={FIELD_CLASS}
                          value={row.bankOther ?? ''}
                          placeholder="Escribe el nombre del banco"
                          type="text"
                          onChange={(event) =>
                            handleAbonoChange(
                              index,
                              'bankOther',
                              event.target.value,
                            )
                          }
                        />
                      ) : null}
                      {showRegisteredAt ? (
                        <p className="px-1 text-xs text-foreground/55">
                          Registrado: {formatAbonoDateTime(row.registeredAt)}
                        </p>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </section>
            </div>

            {isChatReady ? (
              <Suspense fallback={chatFallback}>
                <OrderChatPanel
                  orderUuid={orderUuid}
                  orderLabel={mode === 'edit' ? orderId : ''}
                  clientName={form.clientName}
                  technicianId={form.technicianId}
                  currentUser={user}
                  className="sticky top-6 z-10 h-[min(70vh,36rem)] max-h-[min(70vh,calc(100dvh-3rem))] max-md:top-20 max-md:max-h-[min(70vh,calc(100dvh-5.5rem))]"
                />
              </Suspense>
            ) : (
              chatFallback
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

export default OrderFormView
