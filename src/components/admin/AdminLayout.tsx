import { LogOut } from "lucide-react"
import { NavLink, Outlet } from "react-router-dom"

import { cn } from "@/lib/utils"
import { useAuth } from "@/context/AuthContext"

const TABS = [
  { to: "/admin/asistencia", label: "Asistencia" },
  { to: "/admin/calendario", label: "Calendario" },
  { to: "/admin/clases", label: "Clases" },
  { to: "/admin/eventos", label: "Eventos" },
  { to: "/admin/alumnos", label: "Alumnos" },
  { to: "/admin/profesores", label: "Profesores" },
  { to: "/admin/academias", label: "Academias" },
  { to: "/admin/planes", label: "Planes" },
  { to: "/admin/pagos", label: "Pagos" },
  { to: "/admin/retencion", label: "Retención" },
]

export function AdminLayout() {
  const { profile, signOut } = useAuth()

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-background/95 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-lg font-bold leading-none text-text">Dance Manager</p>
            <p className="text-xs text-text-muted">{profile?.nombre}</p>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-1.5 rounded-control px-3 py-2 text-sm text-text-muted transition-colors hover:bg-surface-hover hover:text-text"
          >
            <LogOut className="size-4" />
            Salir
          </button>
        </div>

        <nav className="flex gap-1 overflow-x-auto px-4 pb-2">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                cn(
                  "whitespace-nowrap rounded-control px-4 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-brand text-white"
                    : "text-text-muted hover:bg-surface-hover hover:text-text",
                )
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
