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
