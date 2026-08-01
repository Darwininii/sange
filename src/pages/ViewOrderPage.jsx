import { useEffect, useState } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import DashboardLayout from '../components/layout/DashboardLayout'
import Loader from '../hooks/Loader'
import appToast from '../hooks/appToast'
import ConfirmActions from '../shared/ConfirmActions'
import PageHeader from '../hooks/PageHeader'
import {
  getOrderByNumber,
  isOrderVisibleToTechnician,
  updateOrderDiagnosis,
} from '../services/orderService'
import { useAuthStore } from '../store/authStore'
import { signOutUser } from '../utils/auth'

const FIELD_CLASS =
  'w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none focus:border-primary focus:bg-white dark:focus:bg-transparent/10 focus:ring-4 focus:ring-primary/20'

function getErrorMessage(error, fallback) {
  return error instanceof Error ? error.message : fallback
}

function ViewOrderPage() {
  const navigate = useNavigate()
  const { orderId } = useParams({ strict: false })
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const [order, setOrder] = useState(null)
  const [diagnosis, setDiagnosis] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const isAssignedTechnician =
    user?.role === 'technician' &&
    Boolean(order?.technicianId) &&
    order.technicianId === user?.id

  const canEditDiagnosis = isAssignedTechnician

  useEffect(() => {
    let cancelled = false

    async function loadOrder() {
      if (!orderId || !user?.id) {
        setOrder(null)
        setDiagnosis('')
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
          setDiagnosis('')
          appToast.warning('No se encontro la orden.')
          return
        }

        if (
          user.role === 'technician' &&
          (result.technicianId !== user.id ||
            !isOrderVisibleToTechnician(result))
        ) {
          setOrder(null)
          setDiagnosis('')
          appToast.warning(
            result.technicianId === user.id
              ? 'Esta orden aun no esta programada para ti.'
              : 'No tienes acceso a esta orden.',
          )
          navigate({ to: '/dashboard/orders' })
          return
        }

        setOrder(result)
        setDiagnosis(result.diagnosis ?? '')
      } catch (error) {
        if (!cancelled) {
          setOrder(null)
          setDiagnosis('')
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

  function handleCancel() {
    navigate({ to: '/dashboard/orders' })
  }

  async function handleSaveDiagnosis() {
    if (!canEditDiagnosis || !orderId) {
      return
    }

    setIsSaving(true)

    try {
      const updated = await appToast.promise(
        updateOrderDiagnosis(orderId, diagnosis),
        {
          loading: 'Guardando diagnostico...',
          success: 'Diagnostico guardado correctamente.',
          error: (error) =>
            getErrorMessage(error, 'No se pudo guardar el diagnostico.'),
        },
      )

      setOrder(updated)
      setDiagnosis(updated.diagnosis ?? '')
    } catch {
      // Toast already shown
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <DashboardLayout user={user} onLogout={handleLogout}>
      <div className="mx-auto max-w-7xl">
        <PageHeader title="Detalle de orden" />

        <section className="mt-8 rounded-4xl border border-border bg-surface px-5 py-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <h3 className="font-display text-2xl font-semibold text-foreground md:text-3xl">
                Orden #{orderId}
              </h3>
              <p className="mt-1 text-sm text-foreground/55">
                {canEditDiagnosis
                  ? 'Completa el diagnostico de la orden asignada.'
                  : 'Vista de detalle de la orden.'}
              </p>
            </div>

            <ConfirmActions
              cancelLabel="Cancelar"
              confirmLabel="Guardar"
              isSubmitting={isSaving || isLoading}
              onCancel={handleCancel}
              onConfirm={canEditDiagnosis ? handleSaveDiagnosis : handleCancel}
            />
          </div>
        </section>

        <section className="mt-6 rounded-4xl bg-surface p-6 shadow-sm ring-1 ring-border">
          <div className="space-y-4">
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
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-3xl bg-background px-5 py-5 ring-1 ring-border">
                    <p className="text-xs font-semibold uppercase tracking-wider text-foreground/45">
                      Cliente
                    </p>
                    <p className="mt-1 font-display text-2xl font-semibold text-foreground">
                      {order.clientName?.trim() || 'Sin cliente'}
                    </p>
                  </div>

                  <div className="rounded-3xl bg-background px-5 py-5 ring-1 ring-border">
                    <p className="text-xs font-semibold uppercase tracking-wider text-foreground/45">
                      Direccion
                    </p>
                    <p className="mt-1 text-lg font-semibold text-foreground">
                      {order.clientAddress?.trim() || 'Sin direccion'}
                    </p>
                  </div>
                </div>

                <div className="rounded-3xl bg-background px-5 py-5 ring-1 ring-border">
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-wider text-foreground/45">
                      Diagnostico
                    </span>
                    <textarea
                      className={`${FIELD_CLASS} mt-3 min-h-40 resize-y ${
                        canEditDiagnosis
                          ? ''
                          : 'cursor-default bg-foreground/5 text-foreground/80'
                      }`}
                      value={diagnosis}
                      placeholder={
                        canEditDiagnosis
                          ? 'Escribe el diagnostico tecnico...'
                          : 'Sin diagnostico registrado'
                      }
                      readOnly={!canEditDiagnosis}
                      onChange={(event) => {
                        if (canEditDiagnosis) {
                          setDiagnosis(event.target.value)
                        }
                      }}
                    />
                  </label>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </DashboardLayout>
  )
}

export default ViewOrderPage
