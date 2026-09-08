import { CalendarDays, History, Ticket, User } from "lucide-react"
import { NavLink, Outlet } from "react-router-dom"

import { useAuth } from "@/context/AuthContext"
import { useAppSettings } from "@/hooks/useAppSettings"
import { cn } from "@/lib/utils"

const TABS = [
  { to: "/alumno/perfil", label: "Perfil", icon: User },
  { to: "/alumno/calendario", label: "Calendario", icon: CalendarDays },
  { to: "/alumno/reservas", label: "Reservas", icon: Ticket },
  { to: "/alumno/historico", label: "Histórico", icon: History },
]

export function AlumnoLayout() {
  const { profile } = useAuth()
  useAppSettings(profile?.organization_id)

  return (
    <div className="flex min-h-dvh flex-col pb-24">
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6 animate-fade-in">
        <Outlet />
      </main>

      <p className="pb-2 text-center text-[11px] text-text-muted/70">Hecho con Dance Manager</p>

      <nav className="fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-lg items-stretch justify-around rounded-2xl border border-white/10 bg-surface/95 p-1.5 shadow-2xl backdrop-blur-xl">
        {TABS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "flex flex-1 flex-col items-center gap-1 rounded-xl py-2.5 text-xs font-medium transition-colors",
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
