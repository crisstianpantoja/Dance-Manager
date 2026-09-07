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

import { useAuth } from "@/context/AuthContext"
import { useAppSettings } from "@/hooks/useAppSettings"
import { usePagosPendientes } from "@/hooks/usePagosPendientes"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { to: "/admin/inicio", label: "Inicio", icon: Home },
  { to: "/admin/asistencia", label: "Asistencia", icon: QrCode },
  { to: "/admin/alumnos", label: "Alumnos", icon: Users },
  { to: "/admin/profesores", label: "Profesores", icon: UserCircle },
  { to: "/admin/academias", label: "Academias", icon: Building2 },
  { to: "/admin/calendario", label: "Calendario", icon: CalendarRange },
  { to: "/admin/clases", label: "Clases", icon: Ticket },
  { to: "/admin/eventos", label: "Eventos", icon: PartyPopper },
  { to: "/admin/planes", label: "Planes", icon: Tag },
  { to: "/admin/pagos", label: "Pagos", icon: CreditCard },
  { to: "/admin/gastos", label: "Gastos", icon: Wallet },
  { to: "/admin/contratos", label: "Contratos", icon: Music },
  { to: "/admin/retencion", label: "Retención", icon: AlertTriangle },
  { to: "/admin/ajustes", label: "Ajustes", icon: Settings },
]

export function AdminLayout() {
  const { profile, signOut } = useAuth()
  const [menuAbierto, setMenuAbierto] = useState(false)
  const ajustes = useAppSettings()
  const pagosPendientes = usePagosPendientes()

  return (
    <div className="flex min-h-dvh">
      {/* Sidebar de escritorio */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-white/10 bg-gradient-to-b from-surface to-surface/90 md:flex">
        <div className="flex items-start justify-between p-6">
          <div>
            {ajustes.logo_url ? (
              <img src={ajustes.logo_url} alt={ajustes.nombre_app} className="h-9 w-auto object-contain" />
            ) : (
              <p className="text-2xl font-extrabold tracking-tight text-text">
                Dance<span className="text-brand">M</span>anager
              </p>
            )}
            <p className="text-xs text-text-muted">{profile?.nombre}</p>
          </div>
          <button
            onClick={signOut}
            title="Cerrar sesión"
            className="text-text-muted transition-colors hover:text-text"
          >
            <LogOut className="size-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-4">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-control px-4 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-brand text-white shadow-md shadow-brand/20"
                    : "text-text-muted hover:bg-surface-hover hover:text-text",
                )
              }
            >
              <Icon className="size-5" />
              {label}
              {to === "/admin/pagos" && pagosPendientes > 0 && (
                <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-warning px-1.5 text-[10px] font-bold text-background">
                  {pagosPendientes}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Contenido */}
      <main className="min-w-0 flex-1 overflow-x-hidden px-4 py-6 pb-24 md:px-8 md:pb-6 animate-fade-in">
        <Outlet />
      </main>

      {/* Nav inferior de celular */}
      <nav className="fixed inset-x-4 bottom-4 z-40 flex items-center justify-between rounded-2xl border border-white/10 bg-surface/95 p-2 shadow-2xl backdrop-blur-xl md:hidden">
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

          <div className="grid grid-cols-2 gap-4">
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMenuAbierto(false)}
                className={({ isActive }) =>
                  cn(
                    "relative flex flex-col items-center justify-center rounded-2xl border p-4 transition-colors",
                    isActive
                      ? "border-brand bg-brand/5 text-brand"
                      : "border-white/10 bg-background text-text-muted",
                  )
                }
              >
                <Icon className="mb-2 size-6" />
                <span className="text-center text-sm font-medium">{label}</span>
                {to === "/admin/pagos" && pagosPendientes > 0 && (
                  <span className="absolute right-3 top-3 flex h-5 min-w-5 items-center justify-center rounded-full bg-warning px-1.5 text-[10px] font-bold text-background">
                    {pagosPendientes}
                  </span>
                )}
              </NavLink>
            ))}
          </div>

          <button
            onClick={signOut}
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-background p-4 font-medium text-text-muted"
          >
            <LogOut className="size-5" />
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  )
}
