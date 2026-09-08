import { LogOut } from "lucide-react"
import { NavLink, Outlet } from "react-router-dom"

import { useAuth } from "@/context/AuthContext"
import { useAppSettings } from "@/hooks/useAppSettings"
import { cn } from "@/lib/utils"

const TABS = [
  { to: "/profesor/inicio", label: "Inicio" },
  { to: "/profesor/calendario", label: "Calendario" },
  { to: "/profesor/clases", label: "Mis clases" },
  { to: "/profesor/finanzas", label: "Finanzas" },
  { to: "/profesor/carnet", label: "Carnet" },
  { to: "/profesor/evaluar", label: "Evaluar" },
]

export function ProfesorLayout() {
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
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center rounded-control px-4 py-2.5 text-sm font-medium transition-colors",
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

        <p className="px-6 py-4 text-center text-[11px] text-text-muted/70">Hecho con Dance Manager</p>
      </aside>

      <div className="flex min-h-dvh flex-1 flex-col">
        {/* Encabezado + pestañas de celular */}
        <header className="sticky top-0 z-10 border-b border-white/10 bg-background/80 backdrop-blur-xl md:hidden">
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

        <main className="min-w-0 flex-1 overflow-x-hidden px-4 py-6 animate-fade-in md:px-8">
          <div className="mx-auto max-w-5xl">
            <Outlet />
          </div>
        </main>

        <p className="pb-6 text-center text-[11px] text-text-muted/70 md:hidden">Hecho con Dance Manager</p>
      </div>
    </div>
  )
}
