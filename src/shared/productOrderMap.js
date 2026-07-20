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

export function getPartStockWarning(row, products = []) {
  const product = row?.productId
    ? products.find((item) => item.id === row.productId)
    : null
  const stock =
    product?.quantity === null || product?.quantity === undefined
      ? row?.stock
      : Number(product.quantity)

  if (stock === null || stock === undefined || Number.isNaN(Number(stock))) {
    return null
  }

  const stockNumber = Number(stock)
  const quantity = Number(row?.quantity)

  if (Number.isFinite(quantity) && quantity > stockNumber) {
    return 'Supera el stock actual'
  }

  if (stockNumber <= 10) {
    return 'Stock por agotarse'
  }

  return null
}
