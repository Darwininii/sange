import { isSupabaseConfigured, supabase } from '../lib/supabaseClient'
import {
  createEmptyParts,
  normalizePartRows,
} from '../shared/orderPdfConstants'
import {
  activityActions,
  registerActivitySafe,
} from './activityService'

export const INITIAL_ORDER_VALUES = {
  clientName: '',
  clientPhone: '',
  device: '',
  brand: '',
  model: '',
  serialNumber: '',
  serviceType: '',
  serviceCondition: '',
  technicianId: '',
  issue: '',
  serviceCost: '',
  previousServiceNotes: '',
  documentNumber: '',
  externalOrderNumber: '',
  deliveryDate: '',
  repairDate: '',
  purchaseDate: '',
  symptom: '',
  diagnosis: '',
  parts: createEmptyParts(1),
}

const ORDER_SELECT =
  'id, order_number, client_name, client_phone, device, brand, model, serial_number, service_type, service_condition, assigned_technician_id, issue, service_cost, previous_service_notes, document_number, external_order_number, delivery_date, repair_date, purchase_date, symptom, diagnosis, parts, status, created_by, created_at, updated_at'

function normalizeParts(parts) {
  const normalized = normalizePartRows(parts, { minRows: 1 })
  return normalized.length > 0 ? normalized : createEmptyParts(1)
}

function toDateInputValue(value) {
  if (!value) return ''
  const raw = String(value)
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    return raw.slice(0, 10)
  }
  return ''
}

export function formatOrderId(orderNumber) {
  return String(orderNumber).padStart(2, '0')
}

export function parseOrderNumber(orderId) {
  const parsed = Number.parseInt(orderId, 10)
  return Number.isFinite(parsed) ? parsed : null
}

export function getOrderFormValues(order) {
  return {
    clientName: order?.clientName ?? '',
    clientPhone: order?.clientPhone ?? '',
    device: order?.device ?? '',
    brand: order?.brand ?? '',
    model: order?.model ?? '',
    serialNumber: order?.serialNumber ?? '',
    serviceType: order?.serviceType ?? '',
    serviceCondition: order?.serviceCondition ?? '',
    technicianId: order?.technicianId ?? '',
    issue: order?.issue ?? '',
    serviceCost:
      order?.serviceCost === null || order?.serviceCost === undefined
        ? ''
        : String(order.serviceCost),
    previousServiceNotes: order?.previousServiceNotes ?? '',
    documentNumber: order?.documentNumber ?? '',
    externalOrderNumber: order?.externalOrderNumber ?? '',
    deliveryDate: toDateInputValue(order?.deliveryDate),
    repairDate: toDateInputValue(order?.repairDate),
    purchaseDate: toDateInputValue(order?.purchaseDate),
    symptom: order?.symptom ?? '',
    diagnosis: order?.diagnosis ?? '',
    parts: normalizeParts(order?.parts),
  }
}

function requireSupabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase no esta configurado. Revisa VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.')
  }

  return supabase
}

function mapOrder(row) {
  if (!row) {
    return null
  }

  return {
    id: formatOrderId(row.order_number),
    uuid: row.id,
    orderNumber: row.order_number,
    clientName: row.client_name ?? '',
    clientPhone: row.client_phone ?? '',
    device: row.device ?? '',
    brand: row.brand ?? '',
    model: row.model ?? '',
    serialNumber: row.serial_number ?? '',
    serviceType: row.service_type ?? null,
    serviceCondition: row.service_condition ?? null,
    technicianId: row.assigned_technician_id ?? '',
    issue: row.issue ?? '',
    serviceCost: row.service_cost ?? null,
    previousServiceNotes: row.previous_service_notes ?? '',
    documentNumber: row.document_number ?? '',
    externalOrderNumber: row.external_order_number ?? '',
    deliveryDate: row.delivery_date ?? null,
    repairDate: row.repair_date ?? null,
    purchaseDate: row.purchase_date ?? null,
    symptom: row.symptom ?? '',
    diagnosis: row.diagnosis ?? '',
    parts: normalizeParts(row.parts),
    status: row.status ?? 'pending',
    createdBy: row.created_by ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  }
}

function toDbDate(value) {
  const raw = String(value ?? '').trim()
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null
}

function toDbPayload(orderData) {
  const condition = orderData.serviceCondition || null
  const rawCost = String(orderData.serviceCost ?? '').trim()
  const parsedCost = rawCost === '' ? null : Number(rawCost)

  return {
    client_name: orderData.clientName,
    client_phone: orderData.clientPhone ?? '',
    device: orderData.device,
    brand: orderData.brand ?? '',
    model: orderData.model ?? '',
    serial_number: orderData.serialNumber ?? '',
    service_type: orderData.serviceType || null,
    service_condition: condition,
    assigned_technician_id: orderData.technicianId || null,
    issue: orderData.issue,
    service_cost:
      condition === 'billed' && Number.isFinite(parsedCost) ? parsedCost : null,
    previous_service_notes:
      condition === 'warranty' ? orderData.previousServiceNotes ?? '' : '',
    document_number: orderData.documentNumber ?? '',
    external_order_number: orderData.externalOrderNumber ?? '',
    delivery_date: toDbDate(orderData.deliveryDate),
    repair_date: toDbDate(orderData.repairDate),
    purchase_date: toDbDate(orderData.purchaseDate),
    symptom: orderData.symptom ?? '',
    diagnosis: orderData.diagnosis ?? '',
    parts: normalizeParts(orderData.parts),
  }
}

export async function getOrders() {
  const client = requireSupabase()

  const { data, error } = await client
    .from('orders')
    .select(ORDER_SELECT)
    .order('order_number', { ascending: false })

  if (error) {
    throw new Error(`No se pudieron cargar las ordenes: ${error.message}`)
  }

  return (data ?? []).map(mapOrder)
}

export async function getOrderByNumber(orderId) {
  const client = requireSupabase()
  const orderNumber = parseOrderNumber(orderId)

  if (orderNumber === null) {
    return null
  }

  const { data, error } = await client
    .from('orders')
    .select(ORDER_SELECT)
    .eq('order_number', orderNumber)
    .maybeSingle()

  if (error) {
    throw new Error(`No se pudo cargar la orden: ${error.message}`)
  }

  return mapOrder(data)
}

function mapOrderWriteError(error, fallback) {
  const message = String(error?.message ?? '')

  if (
    message.includes('Stock insuficiente') ||
    message.includes('Producto de inventario no encontrado')
  ) {
    return new Error(message)
  }

  return new Error(`${fallback}: ${message || 'Error desconocido.'}`)
}

export async function createOrder(orderData, { createdBy } = {}) {
  const client = requireSupabase()

  const { data, error } = await client
    .from('orders')
    .insert({
      ...toDbPayload(orderData),
      created_by: createdBy ?? null,
      status: 'pending',
    })
    .select(ORDER_SELECT)
    .single()

  if (error) {
    throw mapOrderWriteError(error, 'No se pudo crear la orden')
  }

  const created = mapOrder(data)

  await registerActivitySafe({
    userId: createdBy,
    action: activityActions.order_create,
    metadata: {
      orderId: created.id,
      orderNumber: created.orderNumber,
      clientName: created.clientName,
    },
  })

  return created
}

export async function updateOrder(orderId, orderData) {
  const client = requireSupabase()
  const orderNumber = parseOrderNumber(orderId)

  if (orderNumber === null) {
    throw new Error('Numero de orden invalido.')
  }

  const { data, error } = await client
    .from('orders')
    .update(toDbPayload(orderData))
    .eq('order_number', orderNumber)
    .select(ORDER_SELECT)
    .maybeSingle()

  if (error) {
    throw mapOrderWriteError(error, 'No se pudo actualizar la orden')
  }

  if (!data) {
    throw new Error('No se encontro la orden para actualizar.')
  }

  const updated = mapOrder(data)

  await registerActivitySafe({
    action: activityActions.order_update,
    metadata: {
      orderId: updated.id,
      orderNumber: updated.orderNumber,
      clientName: updated.clientName,
    },
  })

  return updated
}

export async function getTechnicians() {
  const client = requireSupabase()

  const { data, error } = await client
    .from('profiles')
    .select('id, name, last_name')
    .eq('role', 'technician')
    .eq('access_revoked', false)
    .order('name', { ascending: true })

  if (error) {
    throw new Error(`No se pudieron cargar los tecnicos: ${error.message}`)
  }

  return (data ?? []).map((profile) => ({
    value: profile.id,
    label: [profile.name, profile.last_name].filter(Boolean).join(' ').trim() || 'Tecnico',
  }))
}

function getFirstWord(value) {
  return String(value ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)[0] ?? ''
}

function toTitleWord(value) {
  const word = getFirstWord(value).toLocaleLowerCase('es-CO')

  if (!word) {
    return ''
  }

  return word.charAt(0).toLocaleUpperCase('es-CO') + word.slice(1)
}

export function getChatAuthorName(user) {
  const firstName = toTitleWord(user?.name)
  const firstLastName = toTitleWord(user?.lastName)
  return [firstName, firstLastName].filter(Boolean).join(' ') || 'Usuario'
}

export function formatChatAuthorName(value) {
  return String(value ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => toTitleWord(word))
    .join(' ') || 'Usuario'
}

function mapOrderMessage(row) {
  if (!row) {
    return null
  }

  return {
    id: row.id,
    orderId: row.order_id,
    userId: row.user_id,
    authorName: row.author_name?.trim() || 'Usuario',
    body: row.body ?? '',
    createdAt: row.created_at ?? null,
  }
}

export async function getOrderMessages(orderUuid) {
  const client = requireSupabase()

  if (!orderUuid) {
    return []
  }

  const { data, error } = await client
    .from('order_messages')
    .select('id, order_id, user_id, author_name, body, created_at')
    .eq('order_id', orderUuid)
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`No se pudieron cargar los mensajes: ${error.message}`)
  }

  return (data ?? []).map(mapOrderMessage)
}

export async function sendOrderMessage(orderUuid, body, { userId, authorName } = {}) {
  const client = requireSupabase()
  const trimmed = String(body ?? '').trim()

  if (!orderUuid || !userId) {
    throw new Error('No se pudo enviar el mensaje.')
  }

  if (!trimmed) {
    throw new Error('El mensaje no puede estar vacio.')
  }

  const { data, error } = await client
    .from('order_messages')
    .insert({
      order_id: orderUuid,
      user_id: userId,
      author_name: authorName?.trim() || 'Usuario',
      body: trimmed,
    })
    .select('id, order_id, user_id, author_name, body, created_at')
    .single()

  if (error) {
    throw new Error(`No se pudo enviar el mensaje: ${error.message}`)
  }

  return mapOrderMessage(data)
}

export function subscribeOrderMessages(orderUuid, onMessage) {
  const client = requireSupabase()

  if (!orderUuid) {
    return () => {}
  }

  const channel = client
    .channel(`order-chat:${orderUuid}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'order_messages',
        filter: `order_id=eq.${orderUuid}`,
      },
      (payload) => {
        onMessage?.(mapOrderMessage(payload.new))
      },
    )
    .subscribe()

  return () => {
    client.removeChannel(channel)
  }
}
