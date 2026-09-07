import { LogOut } from "lucide-react"
import { NavLink, Outlet } from "react-router-dom"

import { useAuth } from "@/context/AuthContext"
import { useAppSettings } from "@/hooks/useAppSettings"
import { cn } from "@/lib/utils"

const TABS = [
  { to: "/profesor/inicio", label: "Inicio" },
  { to: "/profesor/calendario", label: "Calendario" },
  { to: "/profesor/clases", label: "Mis clases" },
  { to: "/profesor/asistencia", label: "Asistencia" },
  { to: "/profesor/finanzas", label: "Finanzas" },
  { to: "/profesor/carnet", label: "Carnet" },
  { to: "/profesor/consultar-carnet", label: "Consultar" },
]

export function ProfesorLayout() {
  const { profile, signOut } = useAuth()
  const ajustes = useAppSettings()

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-background/80 backdrop-blur-xl">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            {ajustes.logo_url ? (
              <img src={ajustes.logo_url} alt={ajustes.nombre_app} className="h-7 w-auto object-contain" />
            ) : (
              <p className="text-lg font-bold leading-none text-text">{ajustes.nombre_app}</p>
            )}
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
                    ? "bg-brand text-white shadow-md shadow-brand/20"
                    : "text-text-muted hover:bg-surface-hover hover:text-text",
                )
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6 animate-fade-in">
        <Outlet />
      </main>
    </div>
  )
}
