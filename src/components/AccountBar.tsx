import { LogOut } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { ThemeToggle } from "@/components/ThemeToggle"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/context/AuthContext"
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

interface AccountBarProps {
  rolActual: Rol
}

export function AccountBar({ rolActual }: AccountBarProps) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  const rolesDisponibles = profile?.rolesDisponibles ?? [rolActual]
  const iniciales = profile?.nombre?.slice(0, 2).toUpperCase() ?? "??"

  return (
    <div className="flex items-center gap-3 px-6 py-4">
      <Avatar className="size-9 shrink-0">
        <AvatarFallback className="bg-brand/15 text-xs font-semibold text-brand">
          {iniciales}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-text">{profile?.nombre}</p>
        {rolesDisponibles.length > 1 ? (
          <Select value={rolActual} onValueChange={(valor) => navigate(RUTAS[valor as Rol])}>
            <SelectTrigger className="h-auto min-w-0 gap-1 border-none bg-transparent p-0 text-xs text-text-muted hover:border-none hover:bg-transparent focus-visible:ring-0">
              <SelectValue className="truncate" />
            </SelectTrigger>
            <SelectContent>
              {rolesDisponibles.map((rol) => (
                <SelectItem key={rol} value={rol}>
                  {ETIQUETAS[rol]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <p className="truncate text-xs text-text-muted">{ETIQUETAS[rolActual]}</p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <ThemeToggle className="flex size-8 items-center justify-center rounded-full bg-surface-hover hover:bg-overlay" />
        <button
          type="button"
          onClick={signOut}
          title="Cerrar sesión"
          className="flex size-8 items-center justify-center rounded-full bg-surface-hover text-text-muted transition-colors hover:bg-overlay hover:text-text"
        >
          <LogOut className="size-4" />
        </button>
      </div>
    </div>
  )
}
