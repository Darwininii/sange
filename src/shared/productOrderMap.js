/** Fuse.js keys for inventory product lookup on orders. */
export const PRODUCT_SEARCH_KEYS = ['name', 'sku', 'description']

export function createEmptyPartRow() {
  return {
    quantity: '',
    part: '',
    description: '',
    delivery: '',
    productId: '',
    stock: null,
  }
}

export function applyProductToPartRow(row, product) {
  if (!product) {
    return row
  }

  return {
    ...row,
    part: product.name ?? '',
    description: row?.description?.trim()
      ? row.description
      : product.description ?? '',
    productId: product.id ?? '',
    stock:
      product.quantity === null || product.quantity === undefined
        ? null
        : Number(product.quantity),
  }
}

export function sanitizePartAgainstProducts(row, products = []) {
  const next = { ...createEmptyPartRow(), ...(row || {}) }
  const productId = String(next.productId ?? '').trim()

  if (!productId) {
    next.productId = ''
    next.stock = null
    return next
  }

  const product = products.find((item) => item.id === productId)

  if (!product) {
    next.productId = ''
    next.stock = null
    return next
  }

  next.stock =
    product.quantity === null || product.quantity === undefined
      ? null
      : Number(product.quantity)

  return next
}

export function sanitizePartsAgainstProducts(parts, products = []) {
  const rows = Array.isArray(parts) ? parts : []
  return rows.map((row) => sanitizePartAgainstProducts(row, products))
}

/** Sum of quantities per productId from order parts (stock already held by this order). */
export function getProductUsageFromParts(parts = []) {
  const usage = {}

  for (const row of Array.isArray(parts) ? parts : []) {
    const productId = String(row?.productId ?? '').trim()
    if (!productId) {
      continue
    }

    const quantity = Number(row?.quantity)
    if (!Number.isFinite(quantity) || quantity <= 0) {
      continue
    }

    usage[productId] = (usage[productId] ?? 0) + quantity
  }

  return usage
}

/**
 * Shelf stock + units already reserved by the order being edited.
 * On create, reservedUsage is empty so available === shelf stock.
 */
export function getAvailableStockForProduct(product, reservedUsage = {}) {
  const stock = Number(product?.quantity)
  if (!Number.isFinite(stock)) {
    return null
  }

  const reserved = Number(reservedUsage?.[product.id] ?? 0)
  return stock + (Number.isFinite(reserved) && reserved > 0 ? reserved : 0)
}

export function getPartStockWarning(
  row,
  products = [],
  { reservedUsage = {}, parts = null } = {},
) {
  const product = row?.productId
    ? products.find((item) => item.id === row.productId)
    : null

  if (!product) {
    return null
  }

  const available = getAvailableStockForProduct(product, reservedUsage)
  if (available === null) {
    return null
  }

  const productId = row.productId
  const requested = Array.isArray(parts)
    ? (getProductUsageFromParts(parts)[productId] ?? 0)
    : Number(row?.quantity)

  if (Number.isFinite(requested) && requested > available) {
    return 'Supera el stock actual'
  }

  // Inventory left on the shelf after saving this order's demand.
  const shelfAfter = available - (Number.isFinite(requested) ? requested : 0)
  if (shelfAfter <= 10) {
    return 'Stock por agotarse'
  }

  return null
}
