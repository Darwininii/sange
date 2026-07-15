import { useNavigate } from '@tanstack/react-router'
import ActivityHistory from '../components/dashboard/ActivityHistory'
import DashboardLayout from '../components/layout/DashboardLayout'
import PageHeader from '../hooks/PageHeader'
import { useAuthStore } from '../store/authStore'
import { signOutUser } from '../utils/auth'

function DashboardHistoryPage() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)

  async function handleLogout() {
    await signOutUser()
    logout()
    navigate({ to: '/' })
  }

  return (
    <DashboardLayout user={user} onLogout={handleLogout}>
      <div className="mx-auto max-w-7xl">
        <PageHeader title="Historial de actividades" />

        <ActivityHistory />
      </div>
    </DashboardLayout>
  )
}

export default DashboardHistoryPage
