import { useEffect, useState } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import DashboardLayout from '../components/layout/DashboardLayout'
import Loader from '../hooks/Loader'
import appToast from '../hooks/appToast'
import AppButton from '../shared/AppButton'
import PageHeader from '../hooks/PageHeader'
import { getOrderByNumber } from '../services/orderService'
import { useAuthStore } from '../store/authStore'
import { signOutUser } from '../utils/auth'

function getErrorMessage(error, fallback) {
  return error instanceof Error ? error.message : fallback
}

function ViewOrderPage() {
  const navigate = useNavigate()
  const { orderId } = useParams({ strict: false })
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const [order, setOrder] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadOrder() {
      if (!orderId || !user?.id) {
        setOrder(null)
        setIsLoading(false)
        return
      }

      setIsLoading(true)

      try {
        const result = await getOrderByNumber(orderId)

        if (cancelled) {
          return
        }

        if (!result) {
          setOrder(null)
          appToast.warning('No se encontro la orden.')
          return
        }

        if (
          user.role === 'technician' &&
          result.technicianId !== user.id
        ) {
          setOrder(null)
          appToast.warning('No tienes acceso a esta orden.')
          navigate({ to: '/dashboard/orders' })
          return
        }

        setOrder(result)
      } catch (error) {
        if (!cancelled) {
          setOrder(null)
          appToast.danger(
            getErrorMessage(error, 'No se pudo cargar la orden.'),
          )
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadOrder()

    return () => {
      cancelled = true
    }
  }, [orderId, user?.id, user?.role, navigate])

  async function handleLogout() {
    await signOutUser()
    logout()
    navigate({ to: '/' })
  }

  return (
    <DashboardLayout user={user} onLogout={handleLogout}>
      <div className="mx-auto max-w-7xl">
        <PageHeader title="Detalle de orden" />

        <section className="mt-8 rounded-4xl bg-surface p-6 shadow-sm ring-1 ring-border">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="font-display text-2xl font-semibold text-foreground">
                Orden #{orderId}
              </h3>
              <p className="mt-1 text-sm text-foreground/55">
                Vista de solo lectura para el tecnico.
              </p>
            </div>
            <AppButton
              type="button"
              variant="outline"
              effect="zoomIn"
              onClick={() => navigate({ to: '/dashboard/orders' })}
            >
              Volver a ordenes
            </AppButton>
          </div>

          <div className="mt-6">
            {isLoading ? (
              <div className="flex justify-center rounded-3xl bg-background px-5 py-8">
                <Loader
                  label="Cargando orden..."
                  className="text-foreground/55 [&>svg]:text-black/70 dark:[&>svg]:text-white/70"
                />
              </div>
            ) : !order ? (
              <div className="rounded-3xl border border-dashed border-border bg-background px-5 py-10 text-center">
                <p className="font-semibold text-foreground">
                  Orden no disponible
                </p>
              </div>
            ) : (
              <div className="rounded-3xl bg-background px-5 py-5 ring-1 ring-border">
                <p className="text-xs font-semibold uppercase tracking-wider text-foreground/45">
                  Cliente
                </p>
                <p className="mt-1 font-display text-2xl font-semibold text-foreground">
                  {order.clientName?.trim() || 'Sin cliente'}
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </DashboardLayout>
  )
}

export default ViewOrderPage
