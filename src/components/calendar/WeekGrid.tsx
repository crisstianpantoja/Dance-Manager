import { DIAS_CORTOS_DESDE_LUNES, type CeldaCalendario } from "@/lib/calendarGrid"
import { cn } from "@/lib/utils"
import type { AgendaItem } from "@/types/agendaItem"

interface WeekGridProps {
  dias: CeldaCalendario[]
  itemsPorFecha: Map<string, AgendaItem[]>
  onItemClick: (item: AgendaItem) => void
}

export function claseDeItem(item: AgendaItem) {
  if (item.estado === "cancelada") {
    return "border-border bg-overlay-subtle text-text-muted line-through"
  }
  if (item.tipo === "evento") {
    return "border-warning/30 bg-warning/10 text-warning"
  }
  return "border-brand/30 bg-brand/10 text-brand-light"
}

export function WeekGrid({ dias, itemsPorFecha, onItemClick }: WeekGridProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-7 sm:gap-2">
      {dias.map((dia, i) => {
        const items = (itemsPorFecha.get(dia.fecha) ?? [])
          .slice()
          .sort((a, b) => a.hora.localeCompare(b.hora))

        return (
          <div key={dia.fecha} className="flex flex-col gap-2">
            <div
              className={cn(
                "flex items-center justify-between gap-2 rounded-control border border-border px-2 py-1.5 sm:flex-col sm:items-center sm:gap-0.5",
                dia.esHoy && "border-brand/40 bg-brand/10",
              )}
            >
              <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                {DIAS_CORTOS_DESDE_LUNES[i]}
              </span>
              <span className={cn("text-sm font-bold", dia.esHoy ? "text-brand-light" : "text-text")}>
                {dia.dia}
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              {items.length === 0 ? (
                <p className="hidden text-center text-[11px] text-text-muted/60 sm:block">—</p>
              ) : (
                items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onItemClick(item)}
                    className={cn(
                      "flex flex-col gap-0.5 rounded-control border px-2 py-1.5 text-left transition-colors hover:brightness-110",
                      claseDeItem(item),
                    )}
                  >
                    <span className="text-[11px] font-bold">{item.hora.slice(0, 5)}</span>
                    <span className="truncate text-xs font-medium">{item.titulo}</span>
                    {item.profesor && (
                      <span className="truncate text-[10px] opacity-80">{item.profesor}</span>
                    )}
                    {item.lugar && <span className="truncate text-[10px] opacity-80">{item.lugar}</span>}
                  </button>
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
