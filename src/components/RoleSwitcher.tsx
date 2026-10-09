import { useNavigate } from "react-router-dom"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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

interface RoleSwitcherProps {
  rolActual: Rol
  rolesDisponibles: Rol[]
  className?: string
}

export function RoleSwitcher({ rolActual, rolesDisponibles, className }: RoleSwitcherProps) {
  const navigate = useNavigate()

  if (rolesDisponibles.length <= 1) {
    return <p className={className}>{ETIQUETAS[rolActual]}</p>
  }

  return (
    <Select value={rolActual} onValueChange={(valor) => navigate(RUTAS[valor as Rol])}>
      <SelectTrigger
        className={`h-auto min-w-0 gap-1 border-none bg-transparent p-0 hover:border-none hover:bg-transparent focus-visible:ring-0 ${className ?? ""}`}
      >
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
  )
}
