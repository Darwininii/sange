/**
 * Maps client record keys -> order form keys.
 * When clients gain new fields that should autofill on orders, add them here.
 */
export const CLIENT_TO_ORDER_FIELDS = {
  name: 'clientName',
  documentNumber: 'documentNumber',
  phone: 'clientPhone',
  email: 'clientEmail',
  address: 'clientAddress',
}

/** Fuse.js keys used when looking up clients from the order form. */
export const CLIENT_SEARCH_KEYS = [
  'name',
  'documentNumber',
  'phone',
  'email',
  'address',
]

export function applyClientToOrderForm(form, client) {
  if (!client) {
    return form
  }

  const next = { ...form }

  Object.entries(CLIENT_TO_ORDER_FIELDS).forEach(([clientKey, orderKey]) => {
    if (Object.prototype.hasOwnProperty.call(client, clientKey)) {
      next[orderKey] = client[clientKey] ?? ''
    }
  })

  return next
}

/** Maps order form client fields into a clients-table payload. */
export function getClientPayloadFromOrderForm(form) {
  return {
    name: String(form?.clientName ?? '').trim(),
    documentNumber: String(form?.documentNumber ?? '').trim(),
    phone: String(form?.clientPhone ?? '').trim(),
    email: String(form?.clientEmail ?? '').trim(),
    address: String(form?.clientAddress ?? '').trim(),
  }
}

/** All client fields on the order are filled with valid values. */
export function isOrderClientInfoComplete(form) {
  const payload = getClientPayloadFromOrderForm(form)

  if (!payload.name) {
    return false
  }

  if (payload.documentNumber.length < 5) {
    return false
  }

  if (payload.phone.length < 7) {
    return false
  }

  if (!payload.email.includes('@')) {
    return false
  }

  if (!payload.address) {
    return false
  }

  return true
}

/**
 * Match against catalog by any identifying field already filled
 * (document, email, phone, or exact name).
 */
export function findMatchingClient(clients = [], form) {
  const list = Array.isArray(clients) ? clients : []
  const payload = getClientPayloadFromOrderForm(form)
  const name = payload.name.toLowerCase()
  const email = payload.email.toLowerCase()

  if (
    !payload.documentNumber &&
    !payload.email &&
    !payload.phone &&
    !payload.name
  ) {
    return null
  }

  return (
    list.find((client) => {
      const clientDoc = String(client?.documentNumber ?? '').trim()
      const clientEmail = String(client?.email ?? '').trim().toLowerCase()
      const clientPhone = String(client?.phone ?? '').trim()
      const clientName = String(client?.name ?? '').trim().toLowerCase()

      if (payload.documentNumber && clientDoc === payload.documentNumber) {
        return true
      }

      if (payload.email && clientEmail && clientEmail === email) {
        return true
      }

      if (payload.phone && clientPhone && clientPhone === payload.phone) {
        return true
      }

      if (payload.name && clientName === name) {
        return true
      }

      return false
    }) || null
  )
}

/** Quick-add button: complete new client data that does not match any existing client. */
export function canQuickAddClientFromOrder(form, clients = []) {
  return (
    isOrderClientInfoComplete(form) && !findMatchingClient(clients, form)
  )
}

/** Auto-create on order save when there is a name and no catalog match. */
export function shouldAutoCreateClientFromOrder(form, clients = []) {
  const payload = getClientPayloadFromOrderForm(form)
  return Boolean(payload.name) && !findMatchingClient(clients, form)
}
