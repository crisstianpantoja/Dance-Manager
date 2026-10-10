import { Check, LogOut, Moon, Sun } from "lucide-react"
import { useNavigate } from "react-router-dom"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/context/AuthContext"
import { useTheme } from "@/hooks/useTheme"
import type { Rol } from "@/types/auth"

const ETIQUETAS: Record<Rol, string> = {
  admin: "Administrador",
  profesor: "Profesor",
  alumno: "Alumno",
}

const RUTAS: Record<Rol, string> = {
  admin: "/admin/inicio",
  profesor: "/profesor/inicio",
  alumno: "/alumno/inicio",
}

interface AccountMenuProps {
  rolActual: Rol
  className?: string
}

export function AccountMenu({ rolActual, className }: AccountMenuProps) {
  const { profile, signOut } = useAuth()
  const { tema, alternar } = useTheme()
  const navigate = useNavigate()

  const rolesDisponibles = profile?.rolesDisponibles ?? [rolActual]
  const iniciales = profile?.nombre?.slice(0, 2).toUpperCase() ?? "??"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title={profile?.nombre}
          className={`flex size-9 shrink-0 items-center justify-center rounded-full bg-brand/15 text-xs font-semibold text-brand transition-colors hover:bg-brand/25 ${className ?? ""}`}
        >
          {iniciales}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top">
        <DropdownMenuLabel>
          <p className="truncate text-sm font-semibold text-text">{profile?.nombre}</p>
          <p className="text-xs text-text-muted">{ETIQUETAS[rolActual]}</p>
        </DropdownMenuLabel>

        {rolesDisponibles.length > 1 && (
          <>
            <DropdownMenuSeparator />
            {rolesDisponibles.map((rol) => (
              <DropdownMenuItem key={rol} onClick={() => navigate(RUTAS[rol])}>
                {rol === rolActual ? (
                  <Check className="size-4" />
                ) : (
                  <span className="size-4" />
                )}
                {ETIQUETAS[rol]}
              </DropdownMenuItem>
            ))}
          </>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={alternar}>
          {tema === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          {tema === "dark" ? "Modo claro" : "Modo oscuro"}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={signOut}
          className="text-error hover:bg-error/10 focus:bg-error/10"
        >
          <LogOut className="size-4" />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
