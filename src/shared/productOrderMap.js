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

export function getPartStockWarning(row, products = []) {
  const product = row?.productId
    ? products.find((item) => item.id === row.productId)
    : null

  if (!product) {
    return null
  }

  const stock = Number(product.quantity)

  if (!Number.isFinite(stock)) {
    return null
  }

  const quantity = Number(row?.quantity)

  if (Number.isFinite(quantity) && quantity > stock) {
    return 'Supera el stock actual'
  }

  if (stock <= 10) {
    return 'Stock por agotarse'
  }

  return null
}
