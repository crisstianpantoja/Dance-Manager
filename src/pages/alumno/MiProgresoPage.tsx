import { ChevronRight, History, Target } from "lucide-react"
import { Link } from "react-router-dom"

import { Card, CardContent } from "@/components/ui/card"

const OPCIONES = [
  {
    to: "/alumno/progreso/evaluaciones",
    icono: Target,
    titulo: "Mis evaluaciones",
    descripcion: "Tus competencias (ritmo, movimiento, imagen, conexión) y las notas de tu profesor.",
  },
  {
    to: "/alumno/progreso/historico",
    icono: History,
    titulo: "Mi histórico",
    descripcion: "Todas las clases a las que ya has asistido.",
  },
]

export function MiProgresoPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-text">Mi progreso</h1>

      <div className="flex flex-col gap-3">
        {OPCIONES.map(({ to, icono: Icono, titulo, descripcion }) => (
          <Link key={to} to={to}>
            <Card className="transition-colors hover:bg-surface-hover">
              <CardContent className="flex items-center gap-4 py-5">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-control bg-brand/10 text-brand-light">
                  <Icono className="size-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-text">{titulo}</p>
                  <p className="text-xs text-text-muted">{descripcion}</p>
                </div>
                <ChevronRight className="size-5 shrink-0 text-text-muted" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
