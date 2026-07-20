import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { IoSearchCircleSharp } from 'react-icons/io5'
import { TbTrashX, TbUserEdit } from 'react-icons/tb'
import DashboardLayout from '../components/layout/DashboardLayout'
import Loader from '../hooks/Loader'
import appToast from '../hooks/appToast'
import ConfirmActions from '../shared/ConfirmActions'
import DashboardListSection from '../shared/DashboardListSection'
import AppDialog from '../shared/dialog'
import Pagination from '../shared/Pagination'
import ProfileActionButton from '../shared/ProfileActionButton'
import YesONo from '../shared/YesONo'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../shared/table'
import { useCachedData } from '../hooks/useCachedData'
import { usePagination } from '../hooks/usePagination'
import {
  createClient,
  deleteClient,
  getClientFormValues,
  getClients,
  INITIAL_CLIENT_VALUES,
  updateClient,
} from '../services/clientService'
import { useAuthStore } from '../store/authStore'
import { invalidateUserCache } from '../store/dataCacheStore'
import { signOutUser } from '../utils/auth'

const FIELD_CLASS =
  'w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none focus:border-primary focus:bg-white dark:focus:bg-transparent/10 focus:ring-4 focus:ring-primary/20'

function FieldLabel({ children, required = false }) {
  return (
    <span className="mb-1 flex items-center gap-1 text-sm font-bold text-foreground/85">
      {children}
      {required ? (
        <span className="size-2.5 text-red-500" aria-hidden="true">
          *
        </span>
      ) : null}
    </span>
  )
}

function getErrorMessage(error, fallback) {
  return error instanceof Error ? error.message : fallback
}

function isValidPhone(value) {
  return !value.trim() || value.trim().length >= 7
}

function isValidDocument(value) {
  return value.trim().length >= 5
}

function hasRequiredFields(form) {
  return Boolean(form.name.trim() && form.documentNumber.trim())
}

function matchesClientSearch(client, query) {
  if (!query) {
    return true
  }

  const normalized = query.toLowerCase()
  const haystack = [client.name, client.documentNumber, client.phone]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return haystack.includes(normalized)
}

function ClientFormFields({ values, onChange }) {
  return (
    <div className="mt-5 grid gap-4">
      <label>
        <FieldLabel required>Nombre</FieldLabel>
        <input
          className={FIELD_CLASS}
          name="name"
          value={values.name}
          placeholder="Nombre del cliente"
          onChange={onChange}
          required
        />
      </label>

      <label>
        <FieldLabel required>Cc. (cedula)</FieldLabel>
        <input
          className={FIELD_CLASS}
          name="documentNumber"
          value={values.documentNumber}
          placeholder="Numero de documento"
          onChange={onChange}
          required
        />
      </label>

      <label>
        <FieldLabel>Telefono</FieldLabel>
        <input
          className={FIELD_CLASS}
          name="phone"
          value={values.phone}
          placeholder="Numero de contacto"
          onChange={onChange}
        />
      </label>
    </div>
  )
}

function DashboardClientsPage() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const [search, setSearch] = useState('')
  const [clientForm, setClientForm] = useState(INITIAL_CLIENT_VALUES)
  const [editClient, setEditClient] = useState(null)
  const [editForm, setEditForm] = useState(INITIAL_CLIENT_VALUES)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    data: clientsData,
    isLoading,
    error,
    refetch: refetchClients,
  } = useCachedData({
    cacheKey: 'clients',
    fetcher: getClients,
    enabled: Boolean(user?.id),
  })

  const clients = Array.isArray(clientsData) ? clientsData : []
  const filteredClients = useMemo(
    () => clients.filter((client) => matchesClientSearch(client, search.trim())),
    [clients, search],
  )

  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    paginate,
  } = usePagination({
    totalItems: filteredClients.length,
    storageKey: 'clients',
  })

  const visibleClients = paginate(filteredClients)

  useEffect(() => {
    setPage(1)
  }, [search, setPage])

  useEffect(() => {
    if (!error) {
      return
    }

    appToast.danger(getErrorMessage(error, 'No se pudieron cargar los clientes.'))
  }, [error])

  async function refreshClients() {
    try {
      if (user?.id) {
        invalidateUserCache(user.id, 'clients')
      }

      await refetchClients({ silent: true, force: true })
    } catch (clientError) {
      appToast.danger(
        getErrorMessage(clientError, 'No se pudieron cargar los clientes.'),
      )
    }
  }

  async function handleLogout() {
    await signOutUser()
    logout()
    navigate({ to: '/' })
  }

  function handleFormChange(setter) {
    return (event) => {
      const { name, value } = event.target
      setter((currentForm) => ({ ...currentForm, [name]: value }))
    }
  }

  function openEditDialog(client) {
    setDeleteTarget(null)
    setEditClient(client)
    setEditForm(getClientFormValues(client))
  }

  function openDeleteDialog(client) {
    setEditClient(null)
    setDeleteTarget(client)
  }

  async function handleCreateClient(event) {
    event?.preventDefault?.()

    if (!hasRequiredFields(clientForm)) {
      appToast.warning('Nombre y cedula son obligatorios.')
      return
    }

    if (!isValidDocument(clientForm.documentNumber)) {
      appToast.warning('La cedula debe tener al menos 5 caracteres.')
      return
    }

    if (!isValidPhone(clientForm.phone)) {
      appToast.warning('Si ingresas telefono, debe tener al menos 7 caracteres.')
      return
    }

    setIsSubmitting(true)

    try {
      await appToast.promise(
        createClient(clientForm, { createdBy: user?.id }),
        {
          loading: 'Creando cliente...',
          success: 'Cliente creado correctamente.',
          error: (clientError) =>
            getErrorMessage(clientError, 'No se pudo crear el cliente.'),
        },
      )
      setClientForm(INITIAL_CLIENT_VALUES)
      setIsCreateDialogOpen(false)
      await refreshClients()
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleUpdateClient(event) {
    event?.preventDefault?.()

    if (!editClient) {
      return
    }

    if (!hasRequiredFields(editForm)) {
      appToast.warning('Nombre y cedula son obligatorios.')
      return
    }

    if (!isValidDocument(editForm.documentNumber)) {
      appToast.warning('La cedula debe tener al menos 5 caracteres.')
      return
    }

    if (!isValidPhone(editForm.phone)) {
      appToast.warning('Si ingresas telefono, debe tener al menos 7 caracteres.')
      return
    }

    setIsSubmitting(true)

    try {
      await appToast.promise(updateClient(editClient.id, editForm), {
        loading: 'Actualizando cliente...',
        success: 'Cliente actualizado correctamente.',
        error: (clientError) =>
          getErrorMessage(clientError, 'No se pudo actualizar el cliente.'),
      })
      setEditClient(null)
      await refreshClients()
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDeleteClient() {
    if (!deleteTarget) {
      return
    }

    setIsSubmitting(true)

    try {
      await appToast.promise(deleteClient(deleteTarget.id), {
        loading: 'Eliminando cliente...',
        success: 'Cliente eliminado correctamente.',
        error: (clientError) =>
          getErrorMessage(clientError, 'No se pudo eliminar el cliente.'),
      })
      setDeleteTarget(null)
      await refreshClients()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <DashboardLayout user={user} onLogout={handleLogout}>
      <DashboardListSection
        title="Gestion de clientes"
        sectionTitle="Clientes registrados"
        description="Crea, edita o elimina los clientes del servicio tecnico."
        createLabel="Crear cliente"
        onCreate={() => setIsCreateDialogOpen(true)}
        actions={
          <div className="relative w-full min-w-[16rem] sm:w-72 sm:max-w-xs">
            <IoSearchCircleSharp className="pointer-events-none absolute left-3 top-1/2 size-6.5 -translate-y-1/2 text-foreground/45" />
            <input
              className="w-full rounded-2xl border border-border bg-background py-2.5 pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/20"
              value={search}
              placeholder="Buscar cliente..."
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Buscar clientes"
            />
          </div>
        }
        footer={
          <>
            <AppDialog
              open={isCreateDialogOpen}
              title="Crear cliente"
              onOpenChange={(open) => {
                setIsCreateDialogOpen(open)
                if (!open) {
                  setClientForm(INITIAL_CLIENT_VALUES)
                }
              }}
            >
              <form onSubmit={handleCreateClient}>
                <ClientFormFields
                  values={clientForm}
                  onChange={handleFormChange(setClientForm)}
                />
                <div className="mt-5">
                  <ConfirmActions
                    variant="dialog"
                    cancelLabel="Cancelar"
                    confirmLabel="Crear cliente"
                    isSubmitting={isSubmitting}
                    onCancel={() => setIsCreateDialogOpen(false)}
                    onConfirm={handleCreateClient}
                  />
                </div>
              </form>
            </AppDialog>

            <AppDialog
              open={Boolean(editClient)}
              title={`Editar cliente ${editClient?.name || ''}`}
              onOpenChange={(open) => {
                if (!open) {
                  setEditClient(null)
                }
              }}
            >
              <form onSubmit={handleUpdateClient}>
                <ClientFormFields
                  values={editForm}
                  onChange={handleFormChange(setEditForm)}
                />
                <div className="mt-5">
                  <ConfirmActions
                    variant="dialog"
                    cancelLabel="Cancelar"
                    confirmLabel="Guardar cambios"
                    isSubmitting={isSubmitting}
                    onCancel={() => setEditClient(null)}
                    onConfirm={handleUpdateClient}
                  />
                </div>
              </form>
            </AppDialog>

            <YesONo
              open={Boolean(deleteTarget)}
              title="Eliminar cliente"
              isSubmitting={isSubmitting}
              description={`El cliente ${deleteTarget?.name || ''} se eliminará de forma permanente.`}
              onConfirm={handleDeleteClient}
              onOpenChange={(open) => {
                if (!open) {
                  setDeleteTarget(null)
                }
              }}
            />
          </>
        }
      >
        {isLoading ? (
          <div className="flex justify-center rounded-3xl bg-background px-5 py-8">
            <Loader
              label="Cargando clientes..."
              className="text-foreground/55 [&>svg]:text-black/70 dark:[&>svg]:text-white/70"
            />
          </div>
        ) : clients.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-background px-5 py-10 text-center">
            <p className="font-semibold text-foreground">
              Aún no hay clientes creados
            </p>
            <p className="mt-2 text-sm text-foreground/55">
              Usa el boton "Crear cliente" para registrar el primero.
            </p>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-background px-5 py-10 text-center">
            <p className="font-semibold text-foreground">Sin resultados</p>
            <p className="mt-2 text-sm text-foreground/55">
              No hay clientes que coincidan con la busqueda.
            </p>
          </div>
        ) : (
          <Table
            footer={
              <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
                pageSize={pageSize}
                onPageSizeChange={setPageSize}
              />
            }
          >
            <TableHeader>
              <TableRow className="hover:bg-background">
                <TableHead>Nombre</TableHead>
                <TableHead>Cc.</TableHead>
                <TableHead>Telefono</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleClients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell>
                    <p className="font-bold text-foreground">{client.name}</p>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm text-foreground/80">
                      {client.documentNumber || '—'}
                    </p>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm text-foreground/80">
                      {client.phone || '—'}
                    </p>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <ProfileActionButton
                        icon={TbUserEdit}
                        label="Editar cliente"
                        tooltip="Editar cliente"
                        disabled={isSubmitting}
                        onClick={() => openEditDialog(client)}
                      />
                      <ProfileActionButton
                        icon={TbTrashX}
                        label="Eliminar cliente"
                        tooltip="Eliminar cliente"
                        tone="red"
                        disabled={isSubmitting}
                        onClick={() => openDeleteDialog(client)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DashboardListSection>
    </DashboardLayout>
  )
}

export default DashboardClientsPage
