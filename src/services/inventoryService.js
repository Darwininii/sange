import { isSupabaseConfigured, supabase } from '../lib/supabaseClient'
import {
  activityActions,
  registerActivitySafe,
} from './activityService'

export const INITIAL_PRODUCT_VALUES = {
  name: '',
  sku: '',
  description: '',
  quantity: '0',
  unitPrice: '0',
  imageUrl: '',
}

const PRODUCT_SELECT =
  'id, name, sku, description, quantity, unit_price, image_url, created_by, created_at, updated_at'

const IMAGE_BUCKET = 'inventory-products'
const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const WEBP_QUALITY = 0.82
const WEBP_MAX_EDGE = 1600

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
])

function requireSupabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(
      'Supabase no esta configurado. Revisa VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.',
    )
  }

  return supabase
}

function mapProduct(row) {
  if (!row) {
    return null
  }

  return {
    id: row.id,
    name: row.name ?? '',
    sku: row.sku ?? '',
    description: row.description ?? '',
    quantity: Number(row.quantity ?? 0),
    unitPrice: Number(row.unit_price ?? 0),
    imageUrl: row.image_url ?? '',
    createdBy: row.created_by ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  }
}

function toDbPayload(productData) {
  const quantity = Number(productData.quantity)
  const unitPrice = Number(productData.unitPrice)

  return {
    name: String(productData.name ?? '').trim(),
    sku: String(productData.sku ?? '').trim(),
    description: String(productData.description ?? '').trim(),
    quantity: Number.isFinite(quantity) ? Math.max(0, Math.trunc(quantity)) : 0,
    unit_price: Number.isFinite(unitPrice) ? Math.max(0, unitPrice) : 0,
    image_url: String(productData.imageUrl ?? '').trim(),
  }
}

function fileBaseName(file) {
  const raw = String(file?.name ?? 'producto')
  const withoutExt = raw.replace(/\.[^.]+$/, '')
  const safe = withoutExt.replace(/[^\w.-]+/g, '-').replace(/-+/g, '-').trim()
  return safe || 'producto'
}

/**
 * Converts any browser-decodable image file to WebP via canvas.
 */
export async function convertImageToWebp(
  file,
  { quality = WEBP_QUALITY, maxEdge = WEBP_MAX_EDGE } = {},
) {
  if (!file) {
    throw new Error('Selecciona una imagen.')
  }

  if (typeof createImageBitmap !== 'function') {
    throw new Error('Este navegador no soporta conversion de imagenes.')
  }

  const bitmap = await createImageBitmap(file)

  try {
    const longest = Math.max(bitmap.width, bitmap.height)
    const scale = longest > maxEdge ? maxEdge / longest : 1
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('No se pudo preparar el canvas para WebP.')
    }

    context.drawImage(bitmap, 0, 0, width, height)

    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (!result) {
            reject(new Error('No se pudo convertir la imagen a WebP.'))
            return
          }
          resolve(result)
        },
        'image/webp',
        quality,
      )
    })

    return new File([blob], `${fileBaseName(file)}.webp`, {
      type: 'image/webp',
      lastModified: Date.now(),
    })
  } finally {
    bitmap.close?.()
  }
}

export function getProductFormValues(product) {
  return {
    name: product?.name ?? '',
    sku: product?.sku ?? '',
    description: product?.description ?? '',
    quantity: String(product?.quantity ?? 0),
    unitPrice: String(product?.unitPrice ?? 0),
    imageUrl: product?.imageUrl ?? '',
  }
}

export async function getInventoryProducts() {
  const client = requireSupabase()

  const { data, error } = await client
    .from('inventory_products')
    .select(PRODUCT_SELECT)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`No se pudieron cargar los productos: ${error.message}`)
  }

  return (data ?? []).map(mapProduct)
}

export async function uploadProductImage(file, { userId } = {}) {
  const client = requireSupabase()

  if (!file) {
    throw new Error('Selecciona una imagen.')
  }

  if (!ALLOWED_IMAGE_TYPES.has(file.type) && !String(file.type).startsWith('image/')) {
    throw new Error('Formato no permitido. Usa JPG, PNG, WEBP o GIF.')
  }

  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error('La imagen no puede superar 5 MB.')
  }

  const webpFile = await convertImageToWebp(file)

  if (webpFile.size > MAX_IMAGE_BYTES) {
    throw new Error('La imagen convertida supera 5 MB. Usa una mas liviana.')
  }

  const folder = userId || 'shared'
  const path = `${folder}/${crypto.randomUUID()}.webp`

  const { error } = await client.storage.from(IMAGE_BUCKET).upload(path, webpFile, {
    cacheControl: '3600',
    upsert: false,
    contentType: 'image/webp',
  })

  if (error) {
    throw new Error(`No se pudo subir la imagen: ${error.message}`)
  }

  const { data } = client.storage.from(IMAGE_BUCKET).getPublicUrl(path)

  return data?.publicUrl || ''
}

export async function createInventoryProduct(productData, { createdBy } = {}) {
  const client = requireSupabase()
  const payload = toDbPayload(productData)

  if (!payload.name) {
    throw new Error('El nombre del producto es obligatorio.')
  }

  const { data, error } = await client
    .from('inventory_products')
    .insert({
      ...payload,
      created_by: createdBy ?? null,
    })
    .select(PRODUCT_SELECT)
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error('Ya existe un producto con esa referencia (SKU).')
    }

    throw new Error(`No se pudo crear el producto: ${error.message}`)
  }

  const created = mapProduct(data)

  await registerActivitySafe({
    userId: createdBy,
    action: activityActions.inventory_create,
    metadata: {
      productId: created.id,
      productName: created.name,
      sku: created.sku,
    },
  })

  return created
}

export async function updateInventoryProduct(productId, productData) {
  const client = requireSupabase()

  if (!productId) {
    throw new Error('Producto invalido.')
  }

  const payload = toDbPayload(productData)

  if (!payload.name) {
    throw new Error('El nombre del producto es obligatorio.')
  }

  const { data, error } = await client
    .from('inventory_products')
    .update(payload)
    .eq('id', productId)
    .select(PRODUCT_SELECT)
    .maybeSingle()

  if (error) {
    if (error.code === '23505') {
      throw new Error('Ya existe un producto con esa referencia (SKU).')
    }

    throw new Error(`No se pudo actualizar el producto: ${error.message}`)
  }

  if (!data) {
    throw new Error('No se encontro el producto para actualizar.')
  }

  const updated = mapProduct(data)

  await registerActivitySafe({
    action: activityActions.inventory_update,
    metadata: {
      productId: updated.id,
      productName: updated.name,
      sku: updated.sku,
    },
  })

  return updated
}

export async function deleteInventoryProduct(productId) {
  const client = requireSupabase()

  if (!productId) {
    throw new Error('Producto invalido.')
  }

  const { data: existing } = await client
    .from('inventory_products')
    .select('id, name, sku')
    .eq('id', productId)
    .maybeSingle()

  const { error } = await client
    .from('inventory_products')
    .delete()
    .eq('id', productId)

  if (error) {
    throw new Error(`No se pudo eliminar el producto: ${error.message}`)
  }

  await registerActivitySafe({
    action: activityActions.inventory_delete,
    metadata: {
      productId,
      productName: existing?.name ?? '',
      sku: existing?.sku ?? '',
    },
  })

  return true
}
