import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { FaRegEye } from 'react-icons/fa'
import { IoIosListBox } from 'react-icons/io'
import { IoSearchCircleSharp } from 'react-icons/io5'
import { TbEdit } from 'react-icons/tb'
import DashboardLayout from '../components/layout/DashboardLayout'
import Loader from '../hooks/Loader'
import appToast from '../hooks/appToast'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../shared/Card'
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

/** Primer nombre + primer apellido; el overflow se corta con CSS (…). */
function formatTechnicianClientName(fullName) {
  const parts = String(fullName ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (parts.length === 0) {
    return 'Sin cliente'
  }

  return parts.slice(0, 2).join(' ')
}

function getOrderRecencyTime(order) {
  const updated = order?.updatedAt ? new Date(order.updatedAt).getTime() : 0
  const created = order?.createdAt ? new Date(order.createdAt).getTime() : 0
  return Math.max(updated || 0, created || 0)
}

function OrdersPage() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const [search, setSearch] = useState('')
  const isTechnician = user?.role === 'technician'

  const {
    data: ordersData,
    isLoading,
    error,
  } = useCachedData({
    cacheKey: 'orders',
    fetcher: getOrders,
    enabled: Boolean(user?.id),
  })

  const userId = user?.id

  const orders = useMemo(() => {
    const list = Array.isArray(ordersData) ? ordersData : []
    if (!isTechnician || !userId) {
      return list
    }

    return list
      .filter((order) => order.technicianId === userId)
      .slice()
      .sort((a, b) => getOrderRecencyTime(b) - getOrderRecencyTime(a))
  }, [ordersData, isTechnician, userId])

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
    storageKey: isTechnician ? 'orders-technician' : 'orders',
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

  const searchField = (
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
  )

  return (
    <DashboardLayout user={user} onLogout={handleLogout}>
      <DashboardListSection
        title={isTechnician ? 'Mis ordenes' : 'Gestion de ordenes'}
        sectionTitle={
          isTechnician ? 'Ordenes asignadas' : 'Ordenes registradas'
        }
        description={
          isTechnician
            ? 'Consulta las ordenes que te han asignado.'
            : 'Consulta y crea ordenes de servicio tecnico.'
        }
        createLabel={isTechnician ? undefined : 'Crear orden'}
        onCreate={
          isTechnician
            ? undefined
            : () => navigate({ to: '/dashboard/orders/new' })
        }
        actions={searchField}
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
            <IoIosListBox className="mx-auto size-10 text-foreground/30" />
            <p className="mt-3 font-semibold text-foreground">
              {isTechnician
                ? 'Aun no tienes ordenes asignadas'
                : 'Aún no hay ordenes creadas'}
            </p>
            <p className="mt-2 text-sm text-foreground/55">
              {isTechnician
                ? 'Cuando te asignen una orden, aparecera aqui.'
                : 'Usa el boton "Crear orden" para registrar la primera.'}
            </p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-background px-5 py-10 text-center">
            <p className="font-semibold text-foreground">Sin resultados</p>
            <p className="mt-2 text-sm text-foreground/55">
              No hay ordenes que coincidan con la busqueda.
            </p>
          </div>
        ) : isTechnician ? (
          <>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
              {visibleOrders.map((order) => (
                <Card key={order.uuid ?? order.id} className="rounded-xl">
                  <CardHeader className="min-w-0 gap-0 px-2.5 pt-2.5">
                    <CardTitle className="truncate text-sm">
                      {formatTechnicianClientName(order.clientName)}
                    </CardTitle>
                    <p className="truncate text-[9px] font-semibold uppercase tracking-wide text-foreground/45">
                      Orden #{order.id}
                    </p>
                  </CardHeader>
                  <CardContent className="px-2.5 pb-2.5 pt-1">
                    <p className="truncate text-[10px] text-foreground/45">
                      {formatOrderDate(order.createdAt)}
                    </p>
                  </CardContent>
                  <CardFooter className="gap-1 px-2 py-1.5">
                    <ProfileActionButton
                      icon={FaRegEye}
                      label="Ver orden"
                      tooltip="Ver orden"
                      tone="blue"
                      className="size-7 border-none"
                      onClick={() =>
                        navigate({
                          to: '/dashboard/orders/view/$orderId',
                          params: { orderId: order.id },
                        })
                      }
                    />
                  </CardFooter>
                </Card>
              ))}
            </div>

            <div className="mt-6">
              <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
                pageSize={pageSize}
                onPageSizeChange={setPageSize}
              />
            </div>
          </>
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
