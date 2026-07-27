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
  createSupplier,
  deleteSupplier,
  getSupplierFormValues,
  getSuppliers,
  INITIAL_SUPPLIER_VALUES,
  updateSupplier,
} from '../services/supplierService'
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

function hasRequiredFields(form) {
  return Boolean(form.name.trim())
}

function matchesSupplierSearch(supplier, query) {
  if (!query) {
    return true
  }

  const normalized = query.toLowerCase()
  const haystack = [supplier.name, supplier.nit, supplier.address]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return haystack.includes(normalized)
}

function SupplierFormFields({ values, onChange }) {
  return (
    <div className="mt-5 grid gap-4 sm:grid-cols-2">
      <label className="sm:col-span-2">
        <FieldLabel required>Nombre del proveedor</FieldLabel>
        <input
          className={FIELD_CLASS}
          name="name"
          value={values.name}
          placeholder="Nombre del proveedor"
          onChange={onChange}
          required
        />
      </label>

      <label>
        <FieldLabel>NIT</FieldLabel>
        <input
          className={FIELD_CLASS}
          name="nit"
          value={values.nit}
          placeholder="NIT del proveedor"
          onChange={onChange}
        />
      </label>

      <label>
        <FieldLabel>Direccion</FieldLabel>
        <input
          className={FIELD_CLASS}
          name="address"
          value={values.address}
          placeholder="Direccion del proveedor"
          onChange={onChange}
        />
      </label>
    </div>
  )
}

function DashboardSuppliersPage() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const [search, setSearch] = useState('')
  const [supplierForm, setSupplierForm] = useState(INITIAL_SUPPLIER_VALUES)
  const [editSupplier, setEditSupplier] = useState(null)
  const [editForm, setEditForm] = useState(INITIAL_SUPPLIER_VALUES)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    data: suppliersData,
    isLoading,
    error,
    refetch: refetchSuppliers,
  } = useCachedData({
    cacheKey: 'suppliers',
    fetcher: getSuppliers,
    enabled: Boolean(user?.id),
  })

  const suppliers = Array.isArray(suppliersData) ? suppliersData : []
  const filteredSuppliers = useMemo(
    () =>
      suppliers.filter((supplier) =>
        matchesSupplierSearch(supplier, search.trim()),
      ),
    [suppliers, search],
  )

  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    paginate,
  } = usePagination({
    totalItems: filteredSuppliers.length,
    storageKey: 'suppliers',
  })

  const visibleSuppliers = paginate(filteredSuppliers)

  useEffect(() => {
    setPage(1)
  }, [search, setPage])

  useEffect(() => {
    if (!error) {
      return
    }

    appToast.danger(
      getErrorMessage(error, 'No se pudieron cargar los proveedores.'),
    )
  }, [error])

  async function refreshSuppliers() {
    try {
      if (user?.id) {
        invalidateUserCache(user.id, 'suppliers')
      }

      await refetchSuppliers({ silent: true, force: true })
    } catch (supplierError) {
      appToast.danger(
        getErrorMessage(supplierError, 'No se pudieron cargar los proveedores.'),
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

  function openEditDialog(supplier) {
    setDeleteTarget(null)
    setEditSupplier(supplier)
    setEditForm(getSupplierFormValues(supplier))
  }

  function openDeleteDialog(supplier) {
    setEditSupplier(null)
    setDeleteTarget(supplier)
  }

  async function handleCreateSupplier(event) {
    event?.preventDefault?.()

    if (!hasRequiredFields(supplierForm)) {
      appToast.warning('El nombre es obligatorio.')
      return
    }

    setIsSubmitting(true)

    try {
      await appToast.promise(
        createSupplier(supplierForm, { createdBy: user?.id }),
        {
          loading: 'Creando proveedor...',
          success: 'Proveedor creado correctamente.',
          error: (supplierError) =>
            getErrorMessage(supplierError, 'No se pudo crear el proveedor.'),
        },
      )
      setSupplierForm(INITIAL_SUPPLIER_VALUES)
      setIsCreateDialogOpen(false)
      await refreshSuppliers()
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleUpdateSupplier(event) {
    event?.preventDefault?.()

    if (!editSupplier) {
      return
    }

    if (!hasRequiredFields(editForm)) {
      appToast.warning('El nombre es obligatorio.')
      return
    }

    setIsSubmitting(true)

    try {
      await appToast.promise(updateSupplier(editSupplier.id, editForm), {
        loading: 'Actualizando proveedor...',
        success: 'Proveedor actualizado correctamente.',
        error: (supplierError) =>
          getErrorMessage(supplierError, 'No se pudo actualizar el proveedor.'),
      })
      setEditSupplier(null)
      await refreshSuppliers()
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDeleteSupplier() {
    if (!deleteTarget) {
      return
    }

    setIsSubmitting(true)

    try {
      await appToast.promise(deleteSupplier(deleteTarget.id), {
        loading: 'Eliminando proveedor...',
        success: 'Proveedor eliminado correctamente.',
        error: (supplierError) =>
          getErrorMessage(supplierError, 'No se pudo eliminar el proveedor.'),
      })
      setDeleteTarget(null)
      await refreshSuppliers()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <DashboardLayout user={user} onLogout={handleLogout}>
      <DashboardListSection
        title="Gestion de proveedores"
        sectionTitle="Proveedores registrados"
        description="Crea, edita o elimina los proveedores del inventario y compras."
        createLabel="Crear proveedor"
        onCreate={() => setIsCreateDialogOpen(true)}
        actions={
          <div className="relative w-full min-w-[16rem] sm:w-72 sm:max-w-xs">
            <IoSearchCircleSharp className="pointer-events-none absolute left-3 top-1/2 size-6.5 -translate-y-1/2 text-foreground/45" />
            <input
              className="w-full rounded-2xl border border-border bg-background py-2.5 pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/20"
              value={search}
              placeholder="Buscar proveedor..."
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Buscar proveedores"
            />
          </div>
        }
        footer={
          <>
            <AppDialog
              open={isCreateDialogOpen}
              title="Crear proveedor"
              className="max-w-2xl"
              onOpenChange={(open) => {
                setIsCreateDialogOpen(open)
                if (!open) {
                  setSupplierForm(INITIAL_SUPPLIER_VALUES)
                }
              }}
            >
              <form onSubmit={handleCreateSupplier}>
                <SupplierFormFields
                  values={supplierForm}
                  onChange={handleFormChange(setSupplierForm)}
                />
                <div className="mt-5">
                  <ConfirmActions
                    variant="dialog"
                    cancelLabel="Cancelar"
                    confirmLabel="Crear proveedor"
                    isSubmitting={isSubmitting}
                    onCancel={() => setIsCreateDialogOpen(false)}
                    onConfirm={handleCreateSupplier}
                  />
                </div>
              </form>
            </AppDialog>

            <AppDialog
              open={Boolean(editSupplier)}
              title={`Editar proveedor ${editSupplier?.name || ''}`}
              className="max-w-2xl"
              onOpenChange={(open) => {
                if (!open) {
                  setEditSupplier(null)
                }
              }}
            >
              <form onSubmit={handleUpdateSupplier}>
                <SupplierFormFields
                  values={editForm}
                  onChange={handleFormChange(setEditForm)}
                />
                <div className="mt-5">
                  <ConfirmActions
                    variant="dialog"
                    cancelLabel="Cancelar"
                    confirmLabel="Guardar cambios"
                    isSubmitting={isSubmitting}
                    onCancel={() => setEditSupplier(null)}
                    onConfirm={handleUpdateSupplier}
                  />
                </div>
              </form>
            </AppDialog>

            <YesONo
              open={Boolean(deleteTarget)}
              title="Eliminar proveedor"
              isSubmitting={isSubmitting}
              description={`El proveedor ${deleteTarget?.name || ''} se eliminará de forma permanente.`}
              onConfirm={handleDeleteSupplier}
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
              label="Cargando proveedores..."
              className="text-foreground/55 [&>svg]:text-black/70 dark:[&>svg]:text-white/70"
            />
          </div>
        ) : suppliers.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-background px-5 py-10 text-center">
            <p className="font-semibold text-foreground">
              Aún no hay proveedores creados
            </p>
            <p className="mt-2 text-sm text-foreground/55">
              Usa el boton "Crear proveedor" para registrar el primero.
            </p>
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-background px-5 py-10 text-center">
            <p className="font-semibold text-foreground">Sin resultados</p>
            <p className="mt-2 text-sm text-foreground/55">
              No hay proveedores que coincidan con la busqueda.
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
                <TableHead>NIT</TableHead>
                <TableHead>Direccion</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleSuppliers.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell>
                    <p className="font-bold text-foreground">{supplier.name}</p>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm text-foreground/80">
                      {supplier.nit || '—'}
                    </p>
                  </TableCell>
                  <TableCell>
                    <p className="max-w-64 truncate text-sm text-foreground/80">
                      {supplier.address || '—'}
                    </p>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <ProfileActionButton
                        icon={TbUserEdit}
                        label="Editar proveedor"
                        tooltip="Editar proveedor"
                        disabled={isSubmitting}
                        onClick={() => openEditDialog(supplier)}
                      />
                      <ProfileActionButton
                        icon={TbTrashX}
                        label="Eliminar proveedor"
                        tooltip="Eliminar proveedor"
                        tone="red"
                        disabled={isSubmitting}
                        onClick={() => openDeleteDialog(supplier)}
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

export default DashboardSuppliersPage
