import {
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from '@tanstack/react-router'
import App from '../App'
import DashboardHistoryPage from '../pages/DashboardHistoryPage'
import DashboardMyProfilePage from '../pages/DashboardMyProfilePage'
import DashboardPage from '../pages/DashboardPage'
import DashboardProfilesPage from '../pages/DashboardProfilesPage'
import LoginPage from '../pages/LoginPage'
import { useAuthStore } from '../store/authStore'
import { getCurrentSessionUser } from '../utils/auth'

async function getActiveUser() {
  const storedUser = useAuthStore.getState().user

  if (storedUser) {
    return storedUser
  }

  const sessionUser = await getCurrentSessionUser()

  if (sessionUser) {
    useAuthStore.getState().login(sessionUser)
  }

  return sessionUser
}

async function requireDashboardUser({ adminOnly = false } = {}) {
  const user = await getActiveUser()

  if (!user) {
    throw redirect({ to: '/' })
  }

  if (adminOnly && user.role !== 'admin') {
    throw redirect({ to: '/dashboard' })
  }

  return user
}

const rootRoute = createRootRoute({
  component: App,
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: async () => {
    const user = await getActiveUser()

    if (user) {
      throw redirect({
        to: '/dashboard',
      })
    }
  },
  component: LoginPage,
})

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
  beforeLoad: async () => {
    await requireDashboardUser()
  },
  component: DashboardPage,
})

const dashboardMyProfileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard/mi-perfil',
  beforeLoad: async () => {
    await requireDashboardUser()
  },
  component: DashboardMyProfilePage,
})

const dashboardHistoryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard/historial',
  beforeLoad: async () => {
    await requireDashboardUser({ adminOnly: true })
  },
  component: DashboardHistoryPage,
})

const dashboardProfilesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard/perfiles',
  beforeLoad: async () => {
    await requireDashboardUser({ adminOnly: true })
  },
  component: DashboardProfilesPage,
})

const routeTree = rootRoute.addChildren([
  loginRoute,
  dashboardRoute,
  dashboardMyProfileRoute,
  dashboardHistoryRoute,
  dashboardProfilesRoute,
])

export const router = createRouter({ routeTree })
