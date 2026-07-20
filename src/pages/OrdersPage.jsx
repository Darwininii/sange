import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { IoSearchCircleSharp } from 'react-icons/io5'
import { TbEdit } from 'react-icons/tb'
import DashboardLayout from '../components/layout/DashboardLayout'
import Loader from '../hooks/Loader'
import appToast from '../hooks/appToast'
import CustomBadge from '../shared/CustomBadge'
import DashboardListSection from '../shared/DashboardListSection'
import Pagination from '../shared/Pagination'
import ProfileActionButton from '../shared/ProfileActionButton'
import {
  SERVICE_CONDITION_COLORS,
  SERVICE_CONDITION_LABELS,
  SERVICE_TYPE_COLORS,
  SERVICE_TYPE_LABELS,
} from '../shared/orderConstants'
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
import { getOrders } from '../services/orderService'
import { useAuthStore } from '../store/authStore'
import { signOutUser } from '../utils/auth'

const statusLabels = {
  pending: 'Pendiente',
  in_progress: 'En proceso',
  completed: 'Completada',
  cancelled: 'Cancelada',
}

const statusColors = {
  pending: 'amber',
  in_progress: 'blue',
  completed: 'green',
  cancelled: 'red',
}

function getErrorMessage(error, fallback) {
  return error instanceof Error ? error.message : fallback
}

function formatOrderDate(value) {
  if (!value) {
    return '—'
  }

  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function matchesOrderSearch(order, query) {
  if (!query) {
    return true
  }

  const normalized = query.toLowerCase()
  const haystack = [
    order.id,
    String(order.orderNumber ?? ''),
    order.documentNumber,
    order.externalOrderNumber,
    order.clientName,
    order.clientPhone,
    order.device,
    order.brand,
    order.model,
    order.serialNumber,
    order.issue,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return haystack.includes(normalized)
}

function OrdersPage() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const [search, setSearch] = useState('')

  const {
    data: ordersData,
    isLoading,
    error,
  } = useCachedData({
    cacheKey: 'orders',
    fetcher: getOrders,
    enabled: Boolean(user?.id),
  })

  const orders = Array.isArray(ordersData) ? ordersData : []
  const filteredOrders = useMemo(
    () => orders.filter((order) => matchesOrderSearch(order, search.trim())),
    [orders, search],
  )

  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    paginate,
  } = usePagination({
    totalItems: filteredOrders.length,
    storageKey: 'orders',
  })

  const visibleOrders = paginate(filteredOrders)

  useEffect(() => {
    setPage(1)
  }, [search, setPage])

  useEffect(() => {
    if (!error) {
      return
    }

    appToast.danger(getErrorMessage(error, 'No se pudieron cargar las ordenes.'))
  }, [error])

  async function handleLogout() {
    await signOutUser()
    logout()
    navigate({ to: '/' })
  }

  return (
    <DashboardLayout user={user} onLogout={handleLogout}>
      <DashboardListSection
        title="Gestion de ordenes"
        sectionTitle="Ordenes registradas"
        description="Consulta y crea ordenes de servicio tecnico."
        createLabel="Crear orden"
        onCreate={() => navigate({ to: '/dashboard/orders/new' })}
        actions={
          <div className="relative w-full min-w-[16rem] sm:w-72 sm:max-w-xs">
            <IoSearchCircleSharp className="pointer-events-none absolute left-3 top-1/2 size-6.5 -translate-y-1/2 text-foreground/45" />
            <input
              className="w-full rounded-2xl border border-border bg-background py-2.5 pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/20"
              value={search}
              placeholder="Buscar orden..."
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Buscar ordenes"
            />
          </div>
        }
      >
        {isLoading ? (
          <div className="flex justify-center rounded-3xl bg-background px-5 py-8">
            <Loader
              label="Cargando ordenes..."
              className="text-foreground/55 [&>svg]:text-black/70 dark:[&>svg]:text-white/70"
            />
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-background px-5 py-10 text-center">
            <p className="font-semibold text-foreground">
              Aún no hay ordenes creadas
            </p>
            <p className="mt-2 text-sm text-foreground/55">
              Usa el boton "Crear orden" para registrar la primera.
            </p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-background px-5 py-10 text-center">
            <p className="font-semibold text-foreground">Sin resultados</p>
            <p className="mt-2 text-sm text-foreground/55">
              No hay ordenes que coincidan con la busqueda.
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
                <TableHead>Orden</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Equipo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Condicion</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleOrders.map((order) => (
                <TableRow key={order.uuid ?? order.id}>
                  <TableCell>
                    <p className="font-bold text-foreground">#{order.id}</p>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-bold text-foreground">
                        {order.clientName || 'Sin cliente'}
                      </p>
                      <p className="text-sm text-foreground/55">
                        {order.clientPhone || 'Sin telefono'}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-semibold text-foreground">
                        {[order.brand, order.device].filter(Boolean).join(' ') ||
                          'Sin equipo'}
                      </p>
                      <p className="text-sm text-foreground/55">
                        {order.model || order.issue || 'Sin detalle'}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {order.serviceType ? (
                      <CustomBadge
                        color={SERVICE_TYPE_COLORS[order.serviceType] ?? 'neutral'}
                        label={
                          SERVICE_TYPE_LABELS[order.serviceType] ?? order.serviceType
                        }
                      />
                    ) : (
                      <span className="text-sm text-foreground/45">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {order.serviceCondition ? (
                      <CustomBadge
                        color={
                          SERVICE_CONDITION_COLORS[order.serviceCondition] ??
                          'neutral'
                        }
                        label={
                          SERVICE_CONDITION_LABELS[order.serviceCondition] ??
                          order.serviceCondition
                        }
                      />
                    ) : (
                      <span className="text-sm text-foreground/45">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <CustomBadge
                      color={statusColors[order.status] ?? 'neutral'}
                      label={statusLabels[order.status] ?? order.status}
                    />
                  </TableCell>
                  <TableCell>
                    <p className="text-sm text-foreground/70">
                      {formatOrderDate(order.createdAt)}
                    </p>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <ProfileActionButton
                        icon={TbEdit}
                        label="Editar orden"
                        tooltip="Editar orden"
                        onClick={() =>
                          navigate({
                            to: '/dashboard/orders/edit/$orderId',
                            params: { orderId: order.id },
                          })
                        }
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

export default OrdersPage
