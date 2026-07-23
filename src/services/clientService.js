import { isSupabaseConfigured, supabase } from '../lib/supabaseClient'
import {
  activityActions,
  registerActivitySafe,
} from './activityService'

export const INITIAL_CLIENT_VALUES = {
  name: '',
  documentNumber: '',
  phone: '',
}

const CLIENT_SELECT =
  'id, name, document_number, phone, created_by, created_at, updated_at'

function requireSupabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(
      'Supabase no esta configurado. Revisa VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.',
    )
  }

  return supabase
}

function mapClient(row) {
  if (!row) {
    return null
  }

  return {
    id: row.id,
    name: row.name ?? '',
    documentNumber: row.document_number ?? '',
    phone: row.phone ?? '',
    createdBy: row.created_by ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  }
}

function toDbPayload(clientData) {
  return {
    name: String(clientData.name ?? '').trim(),
    document_number: String(clientData.documentNumber ?? '').trim(),
    phone: String(clientData.phone ?? '').trim(),
  }
}

export function getClientFormValues(client) {
  return {
    name: client?.name ?? '',
    documentNumber: client?.documentNumber ?? '',
    phone: client?.phone ?? '',
  }
}

export async function getClients() {
  const client = requireSupabase()

  const { data, error } = await client
    .from('clients')
    .select(CLIENT_SELECT)
    .order('name', { ascending: true })

  if (error) {
    throw new Error(`No se pudieron cargar los clientes: ${error.message}`)
  }

  return (data ?? []).map(mapClient)
}

export async function createClient(clientData, { createdBy } = {}) {
  const client = requireSupabase()
  const payload = toDbPayload(clientData)

  if (!payload.name || !payload.document_number) {
    throw new Error('Nombre y cedula son obligatorios.')
  }

  const { data, error } = await client
    .from('clients')
    .insert({
      ...payload,
      created_by: createdBy ?? null,
    })
    .select(CLIENT_SELECT)
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error('Ya existe un cliente con esa cedula.')
    }

    throw new Error(`No se pudo crear el cliente: ${error.message}`)
  }

  const created = mapClient(data)

  await registerActivitySafe({
    userId: createdBy,
    action: activityActions.client_create,
    metadata: {
      clientId: created.id,
      name: created.name,
      documentNumber: created.documentNumber,
    },
  })

  return created
}

export async function updateClient(clientId, clientData) {
  const client = requireSupabase()

  if (!clientId) {
    throw new Error('Cliente invalido.')
  }

  const payload = toDbPayload(clientData)

  if (!payload.name || !payload.document_number) {
    throw new Error('Nombre y cedula son obligatorios.')
  }

  const { data, error } = await client
    .from('clients')
    .update(payload)
    .eq('id', clientId)
    .select(CLIENT_SELECT)
    .maybeSingle()

  if (error) {
    if (error.code === '23505') {
      throw new Error('Ya existe un cliente con esa cedula.')
    }

    throw new Error(`No se pudo actualizar el cliente: ${error.message}`)
  }

  if (!data) {
    throw new Error('No se encontro el cliente para actualizar.')
  }

  const updated = mapClient(data)

  await registerActivitySafe({
    action: activityActions.client_update,
    metadata: {
      clientId: updated.id,
      name: updated.name,
      documentNumber: updated.documentNumber,
    },
  })

  return updated
}

export async function deleteClient(clientId) {
  const client = requireSupabase()

  if (!clientId) {
    throw new Error('Cliente invalido.')
  }

  const { data: existing } = await client
    .from('clients')
    .select('id, name, document_number')
    .eq('id', clientId)
    .maybeSingle()

  const { error } = await client.from('clients').delete().eq('id', clientId)

  if (error) {
    throw new Error(`No se pudo eliminar el cliente: ${error.message}`)
  }

  await registerActivitySafe({
    action: activityActions.client_delete,
    metadata: {
      clientId,
      name: existing?.name ?? '',
      documentNumber: existing?.document_number ?? '',
    },
  })

  return true
}
