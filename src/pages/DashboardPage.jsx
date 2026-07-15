import { useNavigate } from '@tanstack/react-router'
import RoleDashboard from '../components/dashboard/RoleDashboard'
import DashboardLayout from '../components/layout/DashboardLayout'
import { dashboardByRole } from '../data/dashboard'
import { useAuthStore } from '../store/authStore'
import { signOutUser } from '../utils/auth'

function DashboardPage() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const dashboard = dashboardByRole[user.role] ?? dashboardByRole.technician

  async function handleLogout() {
    await signOutUser()
    logout()
    navigate({ to: '/' })
  }

  return (
    <DashboardLayout user={user} onLogout={handleLogout}>
      <RoleDashboard dashboard={dashboard} />
    </DashboardLayout>
  )
}

export default DashboardPage
