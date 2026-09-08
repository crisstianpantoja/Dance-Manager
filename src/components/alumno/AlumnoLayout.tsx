import { CalendarDays, Home, LineChart, LogOut, PartyPopper, User, Wallet } from "lucide-react"
import { NavLink, Outlet } from "react-router-dom"

import { useAuth } from "@/context/AuthContext"
import { useAppSettings } from "@/hooks/useAppSettings"
import { cn } from "@/lib/utils"

const TABS = [
  { to: "/alumno/inicio", label: "Inicio", icon: Home },
  { to: "/alumno/clases", label: "Clases", icon: CalendarDays },
  { to: "/alumno/eventos", label: "Eventos", icon: PartyPopper },
  { to: "/alumno/carnet", label: "Carnet", icon: Wallet },
  { to: "/alumno/progreso", label: "Progreso", icon: LineChart },
  { to: "/alumno/perfil", label: "Perfil", icon: User },
]

export function AlumnoLayout() {
  const { profile, signOut } = useAuth()
  const ajustes = useAppSettings(profile?.organization_id)

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
          {TABS.map(({ to, label, icon: Icon }) => (
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
            </NavLink>
          ))}
        </nav>

        <p className="px-6 py-4 text-center text-[11px] text-text-muted/70">Hecho con Dance Manager</p>
      </aside>

      {/* Contenido */}
      <main className="min-w-0 flex-1 overflow-x-hidden px-4 py-6 pb-28 animate-fade-in md:px-8 md:pb-6">
        <div className="mx-auto max-w-5xl">
          <Outlet />
        </div>
      </main>

      <p className="fixed inset-x-0 bottom-24 z-30 text-center text-[11px] text-text-muted/70 md:hidden">
        Hecho con Dance Manager
      </p>

      {/* Nav inferior de celular */}
      <nav className="fixed inset-x-2 bottom-4 z-40 mx-auto flex max-w-lg items-stretch justify-around rounded-2xl border border-white/10 bg-surface/95 p-1 shadow-2xl backdrop-blur-xl sm:inset-x-4 sm:p-1.5 md:hidden">
        {TABS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "flex flex-1 flex-col items-center gap-1 rounded-xl py-2 text-[10px] font-medium transition-colors sm:py-2.5 sm:text-xs",
                isActive ? "bg-brand/10 text-brand-light" : "text-text-muted hover:text-text",
              )
            }
          >
            <Icon className="size-5" />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
