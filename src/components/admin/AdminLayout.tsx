import {
  AlertTriangle,
  Building2,
  CalendarRange,
  CreditCard,
  Home,
  LogOut,
  Menu,
  Music,
  PartyPopper,
  QrCode,
  Receipt,
  Settings,
  Tag,
  Ticket,
  UserCircle,
  Users,
  Wallet,
  X,
} from "lucide-react"
import { useState } from "react"
import { NavLink, Outlet } from "react-router-dom"

import { RoleSwitcher } from "@/components/RoleSwitcher"
import { ThemeToggle } from "@/components/ThemeToggle"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useAuth } from "@/context/AuthContext"
import { useAppSettings } from "@/hooks/useAppSettings"
import { usePagosPendientes } from "@/hooks/usePagosPendientes"
import { AppNavList, type AppNavGroup } from "@/components/layout/AppNavList"
import { cn } from "@/lib/utils"

const NAV_PRINCIPAL = [
  { to: "/admin/inicio", label: "Inicio", icon: Home },
  { to: "/admin/asistencia", label: "Asistencia", icon: QrCode },
]

const NAV_ACADEMIA = [
  { to: "/admin/alumnos", label: "Alumnos", icon: Users },
  { to: "/admin/profesores", label: "Profesores", icon: UserCircle },
  { to: "/admin/finanzas-profesores", label: "Finanzas prof.", icon: Receipt },
  { to: "/admin/academias", label: "Sedes", icon: Building2 },
  { to: "/admin/retencion", label: "Retención", icon: AlertTriangle },
]

const NAV_PROGRAMACION = [
  { to: "/admin/calendario", label: "Calendario", icon: CalendarRange },
  { to: "/admin/clases", label: "Clases", icon: Ticket },
  { to: "/admin/eventos", label: "Eventos", icon: PartyPopper },
]

const NAV_FINANZAS = [
  { to: "/admin/planes", label: "Planes", icon: Tag },
  { to: "/admin/pagos", label: "Pagos", icon: CreditCard },
  { to: "/admin/gastos", label: "Gastos", icon: Wallet },
  { to: "/admin/contratos", label: "Contratos", icon: Music },
]

const NAV_AJUSTES = [{ to: "/admin/ajustes", label: "Ajustes", icon: Settings }]

const NAV_ITEMS = [...NAV_PRINCIPAL, ...NAV_ACADEMIA, ...NAV_PROGRAMACION, ...NAV_FINANZAS, ...NAV_AJUSTES]

export function AdminLayout() {
  const { profile, signOut } = useAuth()
  const [menuAbierto, setMenuAbierto] = useState(false)
  const ajustes = useAppSettings(profile?.organization_id)
  const pagosPendientes = usePagosPendientes()

  const navGroups: AppNavGroup[] = [
    { items: NAV_PRINCIPAL },
    { heading: "Academia", items: NAV_ACADEMIA },
    { heading: "Programación", items: NAV_PROGRAMACION },
    {
      heading: "Finanzas",
      items: NAV_FINANZAS.map((item) =>
        item.to === "/admin/pagos" && pagosPendientes > 0
          ? { ...item, badge: pagosPendientes }
          : item,
      ),
    },
    { items: NAV_AJUSTES },
  ]

  return (
    <div className="flex min-h-dvh">
      {/* Sidebar de escritorio */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-gradient-to-b from-surface to-surface/90 md:flex">
        <div className="p-6">
          <div className="mb-5">
            {ajustes.logo_url ? (
              <img src={ajustes.logo_url} alt={ajustes.nombre_app} className="h-9 w-auto object-contain" />
            ) : (
              <p className="text-2xl font-extrabold tracking-tight text-text">
                Dance<span className="text-brand">M</span>anager
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface-hover/60 p-3">
            <div className="flex items-center gap-3">
              <Avatar className="size-10 shrink-0">
                <AvatarFallback className="bg-brand/15 text-sm font-semibold text-brand">
                  {profile?.nombre?.slice(0, 2).toUpperCase() ?? "AD"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-text">{profile?.nombre}</p>
                <RoleSwitcher
                  rolActual="admin"
                  rolesDisponibles={profile?.rolesDisponibles ?? ["admin"]}
                  className="truncate text-xs text-text-muted"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-1 border-t border-border/60 pt-2">
              <ThemeToggle className="rounded-control p-1.5 hover:bg-surface" />
              <button
                onClick={signOut}
                title="Cerrar sesión"
                className="rounded-control p-1.5 text-text-muted transition-colors hover:bg-surface hover:text-text"
              >
                <LogOut className="size-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <AppNavList groups={navGroups} />
        </div>

        <p className="px-6 py-4 text-center text-[11px] text-text-muted/70">
          Hecho con Dance Manager
        </p>
      </aside>

      {/* Contenido */}
      <main className="min-w-0 flex-1 overflow-x-hidden px-4 py-6 pb-24 md:px-8 md:pb-6 animate-fade-in">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>

      {/* Nav inferior de celular */}
      <nav className="fixed inset-x-4 bottom-4 z-40 flex items-center justify-between rounded-2xl border border-border bg-surface/95 p-2 shadow-2xl backdrop-blur-xl md:hidden">
        {NAV_ITEMS.slice(0, 3).map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setMenuAbierto(false)}
            className={({ isActive }) =>
              cn(
                "flex h-14 flex-1 flex-col items-center justify-center rounded-xl transition-colors",
                isActive && !menuAbierto ? "bg-brand/10 text-brand" : "text-text-muted",
              )
            }
          >
            <Icon className="mb-1 size-5" />
            <span className="text-[10px] font-medium">{label}</span>
          </NavLink>
        ))}
        <button
          onClick={() => setMenuAbierto((v) => !v)}
          className={cn(
            "flex h-14 flex-1 flex-col items-center justify-center rounded-xl transition-colors",
            menuAbierto ? "bg-brand/10 text-brand" : "text-text-muted",
          )}
        >
          <Menu className="mb-1 size-5" />
          <span className="text-[10px] font-medium">Más</span>
        </button>
      </nav>

      {/* Menú completo de celular */}
      {menuAbierto && (
        <div className="fixed inset-0 z-30 overflow-y-auto bg-surface/98 px-6 pb-28 pt-8 backdrop-blur-md md:hidden">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-text">Menú</h2>
            <button onClick={() => setMenuAbierto(false)} className="text-text-muted">
              <X className="size-6" />
            </button>
          </div>

          <div className="flex flex-col gap-6">
            {navGroups.map((group, idx) => (
              <div key={idx} className="flex flex-col gap-3">
                {group.heading && (
                  <p className="px-1 text-xs font-semibold uppercase tracking-wider text-text-muted/50">
                    {group.heading}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-4">
                  {group.items.map(({ to, label, icon: Icon, badge }) => (
                    <NavLink
                      key={to}
                      to={to}
                      onClick={() => setMenuAbierto(false)}
                      className={({ isActive }) =>
                        cn(
                          "relative flex flex-col items-center justify-center rounded-2xl border p-4 transition-colors",
                          isActive
                            ? "border-brand bg-brand/5 text-brand"
                            : "border-border bg-background text-text-muted",
                        )
                      }
                    >
                      <Icon className="mb-2 size-6" />
                      <span className="text-center text-sm font-medium">{label}</span>
                      {badge != null && (
                        <span className="absolute right-3 top-3 flex h-5 min-w-5 items-center justify-center rounded-full bg-warning px-1.5 text-[10px] font-bold text-background">
                          {badge}
                        </span>
                      )}
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex gap-3">
            <ThemeToggle className="flex flex-1 items-center justify-center rounded-2xl border border-border bg-background p-4 font-medium text-text-muted" />
            <button
              onClick={signOut}
              className="flex flex-[2] items-center justify-center gap-2 rounded-2xl border border-border bg-background p-4 font-medium text-text-muted"
            >
              <LogOut className="size-5" />
              Cerrar sesión
            </button>
          </div>
          <p className="mt-4 text-center text-[11px] text-text-muted/70">
            Hecho con Dance Manager
          </p>
        </div>
      )}
    </div>
  )
}
