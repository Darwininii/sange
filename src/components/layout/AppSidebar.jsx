import { useState } from 'react'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { FaClockRotateLeft, FaCashRegister, FaUserTie } from 'react-icons/fa6'
import { FaSun, FaUsersCog } from 'react-icons/fa'
import { GiMoon } from 'react-icons/gi'
import { IoIosListBox } from 'react-icons/io'
import { PiPackageFill } from 'react-icons/pi'
import { BiSolidDashboard } from 'react-icons/bi'
import { HiUserCircle } from 'react-icons/hi2'
import { HiOutlineLogout } from "react-icons/hi";
import { TbArrowBigUpFilled, TbUsersGroup } from 'react-icons/tb'
import AppButton from '@/shared/AppButton'
import TitleName from '@/shared/TitleName'
import { cn } from '@/lib/utils'
import { useThemeStore } from '@/store/themeStore'
import { useNotificationStore } from '@/store/notificationStore'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/animate-ui/components/radix/dropdown-menu'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from '@/components/animate-ui/components/radix/sidebar'

const navigationItems = [
  {
    label: 'Resumen',
    to: '/dashboard',
    icon: BiSolidDashboard,
  },
  {
    label: 'Ordenes',
    to: '/dashboard/orders',
    icon: IoIosListBox,
  },
  {
    label: 'Inventario',
    to: '/dashboard/inventory',
    icon: PiPackageFill,
  },
  {
    label: 'Caja',
    to: '/dashboard/caja',
    icon: FaCashRegister,
  },
]

const adminItems = [
  {
    label: 'Perfiles',
    to: '/dashboard/perfiles',
    icon: FaUsersCog,
  },
  {
    label: 'Clientes',
    to: '/dashboard/clients',
    icon: TbUsersGroup,
  },
  {
    label: 'Proveedores',
    to: '/dashboard/proveedor',
    icon: FaUserTie,
  },
  {
    label: 'Historial',
    to: '/dashboard/historial',
    icon: FaClockRotateLeft,
  },
]

const TECHNICIAN_NAV_PATHS = new Set(['/dashboard', '/dashboard/orders'])

function getNavigationItemsForRole(role) {
  if (role === 'technician') {
    return navigationItems.filter((item) => TECHNICIAN_NAV_PATHS.has(item.to))
  }

  return navigationItems
}

const roleLabels = {
  admin: 'Administrador',
  cashier: 'Cajero',
  technician: 'Tecnico',
}

function getUserMenuOptions(theme) {
  const isDark = theme === 'dark'
  const nextTheme = isDark ? 'light' : 'dark'

  return [
    {
      value: 'profile',
      label: 'Mi perfil',
      icon: HiUserCircle,
    },
    {
      value: nextTheme,
      label: isDark ? 'Tema claro' : 'Tema oscuro',
      icon: isDark ? FaSun : GiMoon,
    },
    {
      value: 'logout',
      label: 'Cerrar sesion',
      icon: HiOutlineLogout,
      className:
        'text-red-600 data-highlighted:bg-red-500/10 data-highlighted:text-red-700 dark:text-red-300 dark:data-highlighted:text-red-200',
    },
  ]
}

function getDisplayName(user) {
  return [user?.name, user?.lastName].filter(Boolean).join(' ').trim() || 'Usuario'
}

function getUserInitial(user) {
  return getDisplayName(user).charAt(0).toUpperCase() || 'U'
}

function NavItem({ item, isActive, isCollapsed, badgeCount = 0 }) {
  const Icon = item.icon

  return (
    <SidebarMenuItem className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
      <SidebarMenuButton
        asChild
        isActive={isActive}
        className="group-data-[collapsible=icon]:mx-auto"
      >
        <AppButton
          to={item.to}
          href={item.href}
          variant="ghost"
          leftIcon={Icon}
          badgeCount={badgeCount}
          tooltip={isCollapsed ? item.label : undefined}
          tooltipSide="right"
          iconClassName={cn(
            'size-5 transition-colors duration-200',
            isActive
              ? 'text-[#1A2340] dark:text-primary'
              : 'text-foreground/55 group-hover:text-[#1A2340] dark:group-hover:text-primary',
          )}
          className={cn(
            'w-full justify-start gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-all duration-200',
            'group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:p-0',
            isActive
              ? 'bg-[#1A2340]/10 text-[#1A2340] shadow-lg shadow-[#1A2340]/20 dark:bg-foreground/10 dark:text-foreground dark:shadow-primary/10'
              : 'text-foreground/45 hover:bg-transparent hover:text-[#1A2340] dark:hover:text-foreground',
          )}
        >
          <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
        </AppButton>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

function handleUserMenuAction(action, { navigate, setTheme, onLogout }) {
  if (action === 'profile') {
    navigate({ to: '/dashboard/mi-perfil' })
    return
  }

  if (action === 'light' || action === 'dark') {
    // setTheme aplica al instante (sin View Transition), mas fiable desde el menu.
    setTheme(action)
    return
  }

  if (action === 'logout') {
    onLogout?.()
  }
}

function AppSidebar({ user, onLogout }) {
  const navigate = useNavigate()
  const { state, isMobile } = useSidebar()
  const isCollapsed = !isMobile && state === 'collapsed'
  const theme = useThemeStore((store) => store.theme)
  const setTheme = useThemeStore((store) => store.setTheme)
  const pathname = useRouterState({
    select: (routerState) => routerState.location.pathname,
  })
  const unreadByCategory = useNotificationStore((store) => store.unreadByCategory)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  // During logout, user becomes null before navigation finishes.
  if (!user) {
    return null
  }

  const isAdmin = user.role === 'admin'
  const displayName = getDisplayName(user)
  const userMenuOptions = getUserMenuOptions(theme)
  const visibleNavigationItems = getNavigationItemsForRole(user.role)

  const navBadgeByPath = {
    '/dashboard/orders': unreadByCategory.orders,
    '/dashboard/inventory': unreadByCategory.inventory,
    '/dashboard/perfiles': unreadByCategory.profiles,
  }

  return (
    <Sidebar
      collapsible="icon"
      className="border-r-0"
      containerClassName="bg-background"
    >
      <SidebarHeader className="px-4 pb-2 pt-5 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:pt-4">
        <TitleName
          titleClassName="text-[#1a2340] dark:text-primary"
          iconClassName="size-8 text-[#1a2340] dark:text-primary group-data-[collapsible=icon]:size-5"
          variant="sidebar"
          subtitle="Servicio a tu medida"
          to="/dashboard"
        />
      </SidebarHeader>

      <div className="px-4 py-2 group-data-[collapsible=icon]:px-2">
        <SidebarSeparator className="mx-0 w-full" />
      </div>

      <SidebarContent className="group-data-[collapsible=icon]:items-center">
        <SidebarGroup className="group-data-[collapsible=icon]:p-0">
          <SidebarGroupLabel className="px-4 text-[10px] font-bold uppercase tracking-[0.15em] text-foreground/55">
            Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="px-2 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-0">
              {visibleNavigationItems.map((item) => (
                <NavItem
                  key={item.label}
                  item={item}
                  isActive={
                    item.to === pathname ||
                    (item.to !== '/dashboard' && pathname.startsWith(`${item.to}/`))
                  }
                  isCollapsed={isCollapsed}
                  badgeCount={navBadgeByPath[item.to] ?? 0}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup className="group-data-[collapsible=icon]:p-0">
            <SidebarGroupLabel className="px-4 text-[10px] font-bold uppercase tracking-[0.15em] text-foreground/55">
              Administracion
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="px-2 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-0">
                {adminItems.map((item) => (
                  <NavItem
                    key={item.label}
                    item={item}
                    isActive={item.to === pathname}
                    isCollapsed={isCollapsed}
                    badgeCount={navBadgeByPath[item.to] ?? 0}
                  />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <div className="px-4 py-2 group-data-[collapsible=icon]:px-2">
        <SidebarSeparator className="mx-0 w-full" />
      </div>

      <SidebarFooter className="gap-0 p-3 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:p-2">
        <div
          className={cn(
            'overflow-hidden rounded-2xl bg-surface/80 p-1.5 shadow-sm shadow-black/5 ring-1 ring-border/80',
            'group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:overflow-visible group-data-[collapsible=icon]:rounded-full group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:shadow-none group-data-[collapsible=icon]:ring-0',
          )}
        >
          <DropdownMenu modal={false} open={userMenuOpen} onOpenChange={setUserMenuOpen}>
            <DropdownMenuTrigger
              className={cn(
                'flex h-auto w-full cursor-pointer items-center gap-3 rounded-xl border-transparent bg-transparent px-2 py-2 text-foreground outline-none',
                'hover:bg-foreground/6 focus-visible:bg-foreground/6 focus-visible:ring-0',
                'group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:rounded-full group-data-[collapsible=icon]:p-0',
              )}
            >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#1A2340] text-sm font-bold text-white shadow-sm dark:bg-primary dark:text-primary-foreground">
                  {getUserInitial(user)}
                </span>
              <span className="min-w-0 flex-1 text-left group-data-[collapsible=icon]:hidden">
                <span className="block truncate text-sm font-semibold text-foreground">
                  {displayName}
                </span>
                <span className="block truncate text-[11px] font-medium text-foreground/45">
                  {roleLabels[user.role] ?? 'Sin rol'}
                </span>
              </span>
              <TbArrowBigUpFilled
                className={cn(
                  'size-4 shrink-0 text-foreground/55 transition-transform duration-200 group-data-[collapsible=icon]:hidden',
                  userMenuOpen && 'rotate-180',
                )}
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="top"
              align="start"
              sideOffset={8}
              highlight={false}
              className="z-60 min-w-56 rounded-xl border border-border bg-surface text-foreground shadow-xl shadow-black/40"
            >
              {userMenuOptions.map((option) => {
                const Icon = option.icon

                return (
                  <DropdownMenuItem
                    key={option.value}
                    highlight={false}
                    className={cn(
                      'cursor-pointer gap-2 bg-surface text-foreground',
                      'focus:bg-primary/15 focus:text-amber-700 data-highlighted:bg-primary/15 data-highlighted:text-amber-700',
                      'dark:focus:text-amber-400 dark:data-highlighted:text-amber-400',
                      '[&_svg]:text-current',
                      option.className,
                    )}
                    onSelect={() =>
                      handleUserMenuAction(option.value, {
                        navigate,
                        setTheme,
                        onLogout,
                      })
                    }
                  >
                    {Icon ? <Icon className="size-4 shrink-0" /> : null}
                    {option.label}
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}

export default AppSidebar
