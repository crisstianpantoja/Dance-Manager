import { CalendarDays, Home, LineChart, PartyPopper, User, Wallet } from "lucide-react"
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
  const { profile } = useAuth()
  useAppSettings(profile?.organization_id)

  return (
    <div className="flex min-h-dvh flex-col pb-24">
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6 animate-fade-in">
        <Outlet />
      </main>

      <p className="pb-2 text-center text-[11px] text-text-muted/70">Hecho con Dance Manager</p>

      <nav className="fixed inset-x-2 bottom-4 z-40 mx-auto flex max-w-lg items-stretch justify-around rounded-2xl border border-white/10 bg-surface/95 p-1 shadow-2xl backdrop-blur-xl sm:inset-x-4 sm:p-1.5">
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
