import { useRouterState } from '@tanstack/react-router'
import { dashboardByRole } from '../data/dashboard'
import { useAuthStore } from '../store/authStore'

function resolveDashboardPageTitle(pathname, role) {
  const path = String(pathname ?? '')

  if (path === '/dashboard' || path === '/dashboard/') {
    return dashboardByRole[role]?.title || 'Dashboard'
  }

  if (path.startsWith('/dashboard/orders/view/')) {
    return 'Detalle de orden'
  }

  if (
    path === '/dashboard/orders/new' ||
    path.startsWith('/dashboard/orders/edit/')
  ) {
    return 'Gestion de ordenes'
  }

  if (path === '/dashboard/orders' || path.startsWith('/dashboard/orders/')) {
    return role === 'technician' ? 'Mis ordenes' : 'Gestion de ordenes'
  }

  if (path.startsWith('/dashboard/inventory')) {
    return 'Inventario'
  }

  if (path.startsWith('/dashboard/caja')) {
    return 'Caja'
  }

  if (path.startsWith('/dashboard/perfiles')) {
    return 'Gestion de perfiles'
  }

  if (path.startsWith('/dashboard/clients')) {
    return 'Gestion de clientes'
  }

  if (path.startsWith('/dashboard/proveedor')) {
    return 'Gestion de proveedores'
  }

  if (path.startsWith('/dashboard/historial')) {
    return 'Historial de actividades'
  }

  if (path.startsWith('/dashboard/mi-perfil')) {
    return 'Mi perfil'
  }

  return 'Sange'
}

export function useDashboardPageTitle() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const role = useAuthStore((state) => state.user?.role)

  return resolveDashboardPageTitle(pathname, role)
}
