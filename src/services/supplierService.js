import { isSupabaseConfigured, supabase } from '../lib/supabaseClient'

export const INITIAL_SUPPLIER_VALUES = {
  name: '',
  nit: '',
  address: '',
}

const SUPPLIER_SELECT =
  'id, name, nit, address, created_by, created_at, updated_at'

function requireSupabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(
      'Supabase no esta configurado. Revisa VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.',
    )
  }

  return supabase
}

function mapSupplier(row) {
  if (!row) {
    return null
  }

  return {
    id: row.id,
    name: row.name ?? '',
    nit: row.nit ?? '',
    address: row.address ?? '',
    createdBy: row.created_by ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  }
}

function toDbPayload(supplierData) {
  return {
    name: String(supplierData.name ?? '').trim(),
    nit: String(supplierData.nit ?? '').trim(),
    address: String(supplierData.address ?? '').trim(),
  }
}

export function getSupplierFormValues(supplier) {
  return {
    name: supplier?.name ?? '',
    nit: supplier?.nit ?? '',
    address: supplier?.address ?? '',
  }
}

export async function getSuppliers() {
  const client = requireSupabase()

  const { data, error } = await client
    .from('suppliers')
    .select(SUPPLIER_SELECT)
    .order('name', { ascending: true })

  if (error) {
    throw new Error(`No se pudieron cargar los proveedores: ${error.message}`)
  }

  return (data ?? []).map(mapSupplier)
}

export async function createSupplier(supplierData, { createdBy } = {}) {
  const client = requireSupabase()
  const payload = toDbPayload(supplierData)

  if (!payload.name) {
    throw new Error('El nombre es obligatorio.')
  }

  const { data, error } = await client
    .from('suppliers')
    .insert({
      ...payload,
      created_by: createdBy ?? null,
    })
    .select(SUPPLIER_SELECT)
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error('Ya existe un proveedor con ese NIT.')
    }

    throw new Error(`No se pudo crear el proveedor: ${error.message}`)
  }

  return mapSupplier(data)
}

export async function updateSupplier(supplierId, supplierData) {
  const client = requireSupabase()

  if (!supplierId) {
    throw new Error('Proveedor invalido.')
  }

  const payload = toDbPayload(supplierData)

  if (!payload.name) {
    throw new Error('El nombre es obligatorio.')
  }

  const { data, error } = await client
    .from('suppliers')
    .update(payload)
    .eq('id', supplierId)
    .select(SUPPLIER_SELECT)
    .maybeSingle()

  if (error) {
    if (error.code === '23505') {
      throw new Error('Ya existe un proveedor con ese NIT.')
    }

    throw new Error(`No se pudo actualizar el proveedor: ${error.message}`)
  }

  if (!data) {
    throw new Error('No se encontro el proveedor para actualizar.')
  }

  return mapSupplier(data)
}

export async function deleteSupplier(supplierId) {
  const client = requireSupabase()

  if (!supplierId) {
    throw new Error('Proveedor invalido.')
  }

  const { error } = await client.from('suppliers').delete().eq('id', supplierId)

  if (error) {
    throw new Error(`No se pudo eliminar el proveedor: ${error.message}`)
  }

  return true
}
