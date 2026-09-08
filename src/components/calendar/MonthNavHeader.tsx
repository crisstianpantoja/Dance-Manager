import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"

interface MonthNavHeaderProps {
  etiqueta: string
  onAnterior: () => void
  onSiguiente: () => void
  onHoy: () => void
}

/** Encabezado de navegación de un calendario (mes o semana) — el
 * llamador decide qué significa "anterior/siguiente/hoy". */
export function MonthNavHeader({ etiqueta, onAnterior, onSiguiente, onHoy }: MonthNavHeaderProps) {
  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={onHoy}>
        Hoy
      </Button>
      <div className="flex items-center rounded-control border border-white/15">
        <button
          type="button"
          onClick={onAnterior}
          className="p-2 text-text-muted transition-colors hover:text-text"
          title="Anterior"
        >
          <ChevronLeft className="size-4" />
        </button>
        <p className="min-w-36 text-center text-sm font-medium text-text">{etiqueta}</p>
        <button
          type="button"
          onClick={onSiguiente}
          className="p-2 text-text-muted transition-colors hover:text-text"
          title="Siguiente"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  )
}
