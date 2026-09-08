import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { NOMBRES_MES } from "@/lib/calendarGrid"

interface MonthNavHeaderProps {
  mesVisible: Date
  onCambiarMes: (mes: Date) => void
}

export function MonthNavHeader({ mesVisible, onCambiarMes }: MonthNavHeaderProps) {
  function irAMesAnterior() {
    onCambiarMes(new Date(mesVisible.getFullYear(), mesVisible.getMonth() - 1, 1))
  }

  function irAMesSiguiente() {
    onCambiarMes(new Date(mesVisible.getFullYear(), mesVisible.getMonth() + 1, 1))
  }

  function irAHoy() {
    const hoy = new Date()
    onCambiarMes(new Date(hoy.getFullYear(), hoy.getMonth(), 1))
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={irAHoy}>
        Hoy
      </Button>
      <div className="flex items-center rounded-control border border-white/15">
        <button
          type="button"
          onClick={irAMesAnterior}
          className="p-2 text-text-muted transition-colors hover:text-text"
          title="Mes anterior"
        >
          <ChevronLeft className="size-4" />
        </button>
        <p className="min-w-36 text-center text-sm font-medium text-text">
          {NOMBRES_MES[mesVisible.getMonth()]} {mesVisible.getFullYear()}
        </p>
        <button
          type="button"
          onClick={irAMesSiguiente}
          className="p-2 text-text-muted transition-colors hover:text-text"
          title="Mes siguiente"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  )
}
