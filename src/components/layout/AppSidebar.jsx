import { useNavigate, useRouterState } from '@tanstack/react-router'
import { FaClockRotateLeft, FaCashRegister } from 'react-icons/fa6'
import { FaSun, FaUsersCog } from 'react-icons/fa'
import { GiAutoRepair, GiMoon } from 'react-icons/gi'
import { IoIosListBox } from 'react-icons/io'
import { PiPackageFill } from 'react-icons/pi'
import { BiSolidDashboard } from 'react-icons/bi'
import { HiUserCircle } from 'react-icons/hi2'
import { HiOutlineLogout } from "react-icons/hi";
import { TbArrowBigUpFilled, TbUsersGroup } from 'react-icons/tb'
import AppButton from '@/shared/AppButton'
import AppSelect from '@/shared/select'
import { cn } from '@/lib/utils'
import { useThemeStore } from '@/store/themeStore'
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
    href: '#caja',
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
    label: 'Historial',
    to: '/dashboard/historial',
    icon: FaClockRotateLeft,
  },
]

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

function NavItem({ item, isActive, isCollapsed }) {
  const Icon = item.icon

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive} tooltip={isCollapsed ? item.label : undefined}>
        <AppButton
          to={item.to}
          href={item.href}
          variant="ghost"
          leftIcon={Icon}
          iconClassName={cn(
            'transition-colors duration-200',
            isActive
              ? 'text-[#1A2340] dark:text-primary'
              : 'text-foreground/55 group-hover:text-[#1A2340] dark:group-hover:text-primary',
          )}
          className={cn(
            'w-full justify-start gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-all duration-200',
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

function AppSidebar({ user, onLogout }) {
  const navigate = useNavigate()
  const { state, isMobile } = useSidebar()
  const isCollapsed = !isMobile && state === 'collapsed'
  const theme = useThemeStore((store) => store.theme)
  const setTheme = useThemeStore((store) => store.setTheme)
  const pathname = useRouterState({
    select: (routerState) => routerState.location.pathname,
  })

  const isAdmin = user.role === 'admin'
  const displayName = getDisplayName(user)
  const userMenuOptions = getUserMenuOptions(theme)

  return (
    <Sidebar
      collapsible="icon"
      className="border-r-0"
      containerClassName="bg-background"
    >
      <SidebarHeader className="px-4 pb-2 pt-5">
        <AppButton
          to="/dashboard"
          variant="ghost"
          leftIcon={GiAutoRepair}
          iconClassName="size-8 "
          className="w-full justify-start gap-3 rounded-2xl px-2 py-3 hover:bg-foreground/6"
        >
          <span className="flex w-full items-center gap-3">
            <span className="flex min-w-0 flex-col text-left group-data-[collapsible=icon]:hidden">
              <strong className="font-display text-xl font-semibold tracking-tight text-foreground">
                Sange
              </strong>
              <span className="-mt-0.5 truncate text-[11px] font-medium text-foreground/55">
                Servicio a tu medida
              </span>
            </span>
          </span>
        </AppButton>
      </SidebarHeader>

      <SidebarSeparator className="mx-6 my-2 bg-foreground/6" />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="px-4 text-[10px] font-bold uppercase tracking-[0.15em] text-foreground/55">
            Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="px-2">
              {navigationItems.map((item) => (
                <NavItem
                  key={item.label}
                  item={item}
                  isActive={
                    item.to === pathname ||
                    (item.to !== '/dashboard' && pathname.startsWith(`${item.to}/`))
                  }
                  isCollapsed={isCollapsed}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="px-4 text-[10px] font-bold uppercase tracking-[0.15em] text-foreground/55">
              Administracion
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="px-2">
                {adminItems.map((item) => (
                  <NavItem
                    key={item.label}
                    item={item}
                    isActive={item.to === pathname}
                    isCollapsed={isCollapsed}
                  />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarSeparator className="mx-4 my-2 bg-foreground/6" />

      <SidebarFooter className="gap-0 p-3">
        <div className="overflow-hidden rounded-2xl bg-surface/80 p-1.5 shadow-sm shadow-black/5 ring-1 ring-border/80">
          <AppSelect
            side="top"
            clearOnSelect
            hideIndicator
            ArrowIcon={TbArrowBigUpFilled}
            arrowClassName="group-data-[collapsible=icon]:hidden"
            options={userMenuOptions}
            onValueChange={(action) => {
              if (action === 'profile') {
                navigate({ to: '/dashboard/mi-perfil' })
                return
              }

              if (action === 'light' || action === 'dark') {
                // setTheme aplica al instante (sin View Transition), mas fiable desde el Select.
                setTheme(action)
                return
              }

              if (action === 'logout') {
                onLogout?.()
              }
            }}
            className="gap-3 rounded-xl border-transparent bg-transparent px-2 py-2 shadow-none hover:bg-foreground/6 focus:border-transparent focus:bg-foreground/6 focus:ring-0"
            contentClassName="rounded-xl"
            triggerContent={
              <>
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
              </>
            }
          />
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}

export default AppSidebar
