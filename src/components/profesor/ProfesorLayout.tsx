import { CalendarRange, Home, LogOut, Receipt, Ticket, Wallet } from "lucide-react"
import { NavLink, Outlet } from "react-router-dom"

import { RoleSwitcher } from "@/components/RoleSwitcher"
import { ThemeToggle } from "@/components/ThemeToggle"
import { AppNavList, type AppNavGroup } from "@/components/layout/AppNavList"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useAuth } from "@/context/AuthContext"
import { useAppSettings } from "@/hooks/useAppSettings"
import { cn } from "@/lib/utils"

const TABS = [
  { to: "/profesor/inicio", label: "Inicio", icon: Home },
  { to: "/profesor/calendario", label: "Calendario", icon: CalendarRange },
  { to: "/profesor/clases", label: "Mis clases", icon: Ticket },
  { to: "/profesor/finanzas", label: "Finanzas", icon: Receipt },
  { to: "/profesor/carnet", label: "Carnet", icon: Wallet },
]

const NAV_GROUPS: AppNavGroup[] = [{ items: TABS }]

export function ProfesorLayout() {
  const { profile, signOut } = useAuth()
  const ajustes = useAppSettings(profile?.organization_id)

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

          <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface-hover/60 p-3">
            <Avatar className="size-10 shrink-0">
              <AvatarFallback className="bg-brand/15 text-sm font-semibold text-brand">
                {profile?.nombre?.slice(0, 2).toUpperCase() ?? "PR"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-text">{profile?.nombre}</p>
              <RoleSwitcher
                rolActual="profesor"
                rolesDisponibles={profile?.rolesDisponibles ?? ["profesor"]}
                className="truncate text-xs text-text-muted"
              />
            </div>
            <div className="flex items-center gap-1">
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
          <AppNavList groups={NAV_GROUPS} />
        </div>

        <p className="px-6 py-4 text-center text-[11px] text-text-muted/70">Hecho con Dance Manager</p>
      </aside>

      <div className="flex min-h-dvh flex-1 flex-col">
        {/* Encabezado + pestañas de celular */}
        <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-xl md:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2.5">
              <Avatar className="size-8 shrink-0">
                <AvatarFallback className="bg-brand/15 text-xs font-semibold text-brand">
                  {profile?.nombre?.slice(0, 2).toUpperCase() ?? "PR"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                {ajustes.logo_url ? (
                  <img src={ajustes.logo_url} alt={ajustes.nombre_app} className="h-6 w-auto object-contain" />
                ) : (
                  <p className="truncate text-sm font-bold leading-none text-text">{ajustes.nombre_app}</p>
                )}
                <p className="truncate text-xs text-text-muted">{profile?.nombre}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <ThemeToggle className="rounded-control p-2 hover:bg-surface-hover" />
              <button
                onClick={signOut}
                className="flex items-center gap-1.5 rounded-control px-3 py-2 text-sm text-text-muted transition-colors hover:bg-surface-hover hover:text-text"
              >
                <LogOut className="size-4" />
                Salir
              </button>
            </div>
          </div>

          <nav className="flex gap-1 overflow-x-auto px-4 pb-2">
            {TABS.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-1.5 whitespace-nowrap rounded-control px-4 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-brand text-white shadow-md shadow-brand/20"
                      : "text-text-muted hover:bg-surface-hover hover:text-text",
                  )
                }
              >
                <tab.icon className="size-4" />
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
