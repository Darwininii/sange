import { isSupabaseConfigured, supabase } from '../lib/supabaseClient'
import { sanitizeProductImageForUpload } from '../shared/sanitizeProductImage'
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

  // Magic-byte check + canvas rewrite to WebP (strips metadata / non-image payloads).
  const webpFile = await sanitizeProductImageForUpload(file)

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

const inventoryChangeListeners = new Set()
let inventoryChangesChannel = null
let inventoryChangesTimer = null

function notifyInventoryChangeListeners() {
  if (inventoryChangesTimer != null) {
    window.clearTimeout(inventoryChangesTimer)
  }

  // Collapse bursts (multi-product stock sync) into one refresh.
  inventoryChangesTimer = window.setTimeout(() => {
    inventoryChangesTimer = null
    inventoryChangeListeners.forEach((listener) => {
      try {
        listener()
      } catch {
        // Ignore listener errors so one bad subscriber cannot break others.
      }
    })
  }, 200)
}

/**
 * Shared Realtime subscription for inventory stock/catalog changes.
 * @param {() => void} onChange
 * @returns {() => void} unsubscribe
 */
export function subscribeInventoryProductsChanges(onChange) {
  if (!isSupabaseConfigured || !supabase || typeof onChange !== 'function') {
    return () => {}
  }

  inventoryChangeListeners.add(onChange)

  if (!inventoryChangesChannel) {
    inventoryChangesChannel = supabase
      .channel('inventory-products-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory_products',
        },
        () => {
          notifyInventoryChangeListeners()
        },
      )
      .subscribe()
  }

  return () => {
    inventoryChangeListeners.delete(onChange)

    if (inventoryChangeListeners.size === 0 && inventoryChangesChannel) {
      if (inventoryChangesTimer != null) {
        window.clearTimeout(inventoryChangesTimer)
        inventoryChangesTimer = null
      }

      supabase.removeChannel(inventoryChangesChannel)
      inventoryChangesChannel = null
    }
  }
}
