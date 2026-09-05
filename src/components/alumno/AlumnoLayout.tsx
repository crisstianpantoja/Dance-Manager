import { CalendarDays, History, Ticket, User } from "lucide-react"
import { NavLink, Outlet } from "react-router-dom"

import { cn } from "@/lib/utils"

const TABS = [
  { to: "/alumno/perfil", label: "Perfil", icon: User },
  { to: "/alumno/calendario", label: "Calendario", icon: CalendarDays },
  { to: "/alumno/reservas", label: "Reservas", icon: Ticket },
  { to: "/alumno/historico", label: "Histórico", icon: History },
]

export function AlumnoLayout() {
  return (
    <div className="flex min-h-dvh flex-col bg-background pb-20">
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 border-t border-white/10 bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-stretch justify-around">
          {TABS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors",
                  isActive ? "text-brand-light" : "text-text-muted hover:text-text",
                )
              }
            >
              <Icon className="size-5" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
