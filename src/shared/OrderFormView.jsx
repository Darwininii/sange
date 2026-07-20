import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { FaFilePdf } from 'react-icons/fa6'
import { IoAddCircle } from 'react-icons/io5'
import { TbTrashX } from 'react-icons/tb'
import DashboardLayout from '../components/layout/DashboardLayout'
import Loader from '../hooks/Loader'
import appToast from '../hooks/appToast'
import PageHeader from '../hooks/PageHeader'
import { useCachedData } from '../hooks/useCachedData'
import AppSelect from './select'
import AppButton from './AppButton'
import ClientLookupInput from './ClientLookupInput'
import ConfirmActions from './ConfirmActions'
import DatePicker from './DatePicker'
import OrderChatPanel from './OrderChatPanel'
import OrderPdfPreviewDialog from './OrderPdfPreviewDialog'
import ProductLookupInput from './ProductLookupInput'
import {
  applyClientToOrderForm,
  CLIENT_SEARCH_KEYS,
} from './clientOrderMap'
import { buildOrderPdfData, PDF_PARTS_MAX_ROWS } from './orderPdfConstants'
import {
  SERVICE_CONDITION_OPTIONS,
  SERVICE_TYPE_OPTIONS,
} from './orderConstants'
import {
  applyProductToPartRow,
  createEmptyPartRow,
  getPartStockWarning,
} from './productOrderMap'
import { getClients } from '../services/clientService'
import { getInventoryProducts } from '../services/inventoryService'
import {
  INITIAL_ORDER_VALUES,
  createOrder,
  getOrderByNumber,
  getOrderFormValues,
  getTechnicians,
  updateOrder,
} from '../services/orderService'
import { useAuthStore } from '../store/authStore'
import { invalidateUserCache } from '../store/dataCacheStore'
import { signOutUser } from '../utils/auth'

const FIELD_CLASS =
  'w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none focus:border-primary focus:bg-white dark:focus:bg-transparent/10 focus:ring-4 focus:ring-primary/20'

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
  const [technicianOptions, setTechnicianOptions] = useState([])
  const [isLoadingOrder, setIsLoadingOrder] = useState(mode === 'edit')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPdfOpen, setIsPdfOpen] = useState(false)
  const config = modeConfig[mode] ?? modeConfig.create
  const isWarranty = form.serviceCondition === 'warranty'
  const isBilled = form.serviceCondition === 'billed'

  const { data: clientsData } = useCachedData({
    cacheKey: 'clients',
    fetcher: getClients,
    enabled: Boolean(user?.id),
  })
  const clients = Array.isArray(clientsData) ? clientsData : []

  const { data: productsData } = useCachedData({
    cacheKey: 'inventory-products',
    fetcher: getInventoryProducts,
    enabled: Boolean(user?.id),
  })
  const products = Array.isArray(productsData) ? productsData : []

  const technicianName = useMemo(() => {
    if (!form.technicianId) {
      return ''
    }

    return (
      technicianOptions.find((option) => option.value === form.technicianId)
        ?.label || ''
    )
  }, [form.technicianId, technicianOptions])

  const pdfData = useMemo(
    () =>
      buildOrderPdfData({
        form,
        orderNumber: mode === 'edit' ? orderId : '',
        technicianName,
        generatedBy:
          [user?.name, user?.lastName].filter(Boolean).join(' ').trim() ||
          user?.nickname ||
          '',
      }),
    [form, mode, orderId, technicianName, user],
  )

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
        setForm(INITIAL_ORDER_VALUES)
        setOrderUuid(null)
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

        setForm(getOrderFormValues(order))
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

  function handleCancel() {
    navigate({ to: '/dashboard/orders' })
  }

  async function handleSubmit(event) {
    event?.preventDefault?.()

    if (
      !form.clientName.trim() ||
      !form.device.trim() ||
      !form.serviceType ||
      !form.serviceCondition ||
      !form.issue.trim()
    ) {
      appToast.warning(
        'Cliente, equipo, tipo de servicio, condicion y motivo son obligatorios.',
      )
      return
    }

    if (isBilled && String(form.serviceCost).trim() === '') {
      appToast.warning('El costo del servicio es obligatorio en ordenes facturadas.')
      return
    }

    const stockBlock = (form.parts || []).find(
      (row) => getPartStockWarning(row, products) === 'Supera el stock actual',
    )

    if (stockBlock) {
      appToast.warning(
        `Supera el stock actual en "${stockBlock.part || 'repuesto'}".`,
      )
      return
    }

    const payload = {
      clientName: form.clientName.trim(),
      clientPhone: form.clientPhone.trim(),
      device: form.device.trim(),
      brand: form.brand.trim(),
      model: form.model.trim(),
      serialNumber: form.serialNumber.trim(),
      serviceType: form.serviceType,
      serviceCondition: form.serviceCondition,
      technicianId: form.technicianId,
      issue: form.issue.trim(),
      serviceCost: form.serviceCost,
      previousServiceNotes: form.previousServiceNotes.trim(),
      documentNumber: form.documentNumber.trim(),
      externalOrderNumber: form.externalOrderNumber.trim(),
      deliveryDate: form.deliveryDate,
      repairDate: form.repairDate,
      purchaseDate: form.purchaseDate,
      symptom: form.symptom.trim(),
      diagnosis: form.diagnosis.trim(),
      parts: form.parts,
    }

    setIsSubmitting(true)

    try {
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
      }

      navigate({ to: '/dashboard/orders' })
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

        <OrderPdfPreviewDialog
          open={isPdfOpen}
          onOpenChange={setIsPdfOpen}
          data={pdfData}
        />

        {isLoadingOrder ? (
          <div className="mt-6 flex justify-center rounded-4xl bg-surface px-5 py-10 shadow-sm ring-1 ring-border">
            <Loader
              label="Cargando orden..."
              className="text-foreground/55 [&>svg]:text-black/70 dark:[&>svg]:text-white/70"
            />
          </div>
        ) : (
          <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,380px)]">
            <form
              className="rounded-4xl bg-surface p-6 shadow-sm ring-1 ring-border"
              onSubmit={handleSubmit}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <FieldLabel required>Tipo de servicio</FieldLabel>
                  <AppSelect
                    value={form.serviceType || undefined}
                    options={SERVICE_TYPE_OPTIONS}
                    placeholder="Seleccionar tipo"
                    onValueChange={(serviceType) =>
                      setForm((currentForm) => ({ ...currentForm, serviceType }))
                    }
                  />
                </div>

                <div>
                  <FieldLabel required>Condicion del servicio</FieldLabel>
                  <AppSelect
                    value={form.serviceCondition || undefined}
                    options={SERVICE_CONDITION_OPTIONS}
                    placeholder="Seleccionar condicion"
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
                        technicianId: technicianId === 'none' ? '' : technicianId,
                      }))
                    }
                  />
                </div>

                <label>
                  <FieldLabel required>Motivo del servicio</FieldLabel>
                  <input
                    className={FIELD_CLASS}
                    name="issue"
                    value={form.issue}
                    placeholder="Diagnostico, revision, instalacion, etc."
                    onChange={handleChange}
                    required
                  />
                </label>

                <DatePicker
                  label="Fecha de entrega"
                  value={form.deliveryDate}
                  placeholder="Seleccionar fecha"
                  onChange={(deliveryDate) =>
                    setForm((currentForm) => ({ ...currentForm, deliveryDate }))
                  }
                />

                <DatePicker
                  label="Fecha de reparacion"
                  value={form.repairDate}
                  placeholder="Seleccionar fecha"
                  onChange={(repairDate) =>
                    setForm((currentForm) => ({ ...currentForm, repairDate }))
                  }
                />

                <DatePicker
                  label="Fecha de compra"
                  value={form.purchaseDate}
                  placeholder="Seleccionar fecha"
                  onChange={(purchaseDate) =>
                    setForm((currentForm) => ({ ...currentForm, purchaseDate }))
                  }
                />

                <label className="md:col-span-2">
                  <FieldLabel>Sintoma</FieldLabel>
                  <textarea
                    className={`${FIELD_CLASS} min-h-24 resize-y`}
                    name="symptom"
                    value={form.symptom}
                    placeholder="Descripcion del sintoma reportado"
                    onChange={handleChange}
                  />
                </label>

                <label className="md:col-span-2">
                  <FieldLabel>Diagnostico</FieldLabel>
                  <textarea
                    className={`${FIELD_CLASS} min-h-24 resize-y`}
                    name="diagnosis"
                    value={form.diagnosis}
                    placeholder="Diagnostico tecnico"
                    onChange={handleChange}
                  />
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

                <div className="md:col-span-2">
                  <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                    <FieldLabel>Repuestos / Delivery</FieldLabel>
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
                  <div className="mt-1 space-y-3 rounded-2xl border border-border p-3">
                    {(form.parts || []).map((row, index) => {
                      const stockWarning = getPartStockWarning(row, products)

                      return (
                        <div
                          key={`part-row-${index}`}
                          className="space-y-1.5 rounded-xl bg-background/60 p-2 ring-1 ring-border/60"
                        >
                          <div className="grid gap-2 md:grid-cols-[minmax(0,1.4fr)_minmax(0,0.7fr)_minmax(0,1.2fr)_minmax(0,0.8fr)_auto]">
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
                            <input
                              className={FIELD_CLASS}
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
                            <input
                              className={FIELD_CLASS}
                              value={row.delivery}
                              placeholder="Delivery"
                              onChange={(event) =>
                                handlePartChange(
                                  index,
                                  'delivery',
                                  event.target.value,
                                )
                              }
                            />
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
                            <p className="px-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
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

            <OrderChatPanel
              orderUuid={orderUuid}
              orderLabel={mode === 'edit' ? orderId : ''}
              currentUser={user}
              className="h-[min(70vh,36rem)] max-h-[min(70vh,36rem)]"
            />
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

export default OrderFormView
