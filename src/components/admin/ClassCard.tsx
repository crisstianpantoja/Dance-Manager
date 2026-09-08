import { Link } from "react-router-dom"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export type EstadoClaseHoy = "cancelada" | "proxima" | "en_curso" | "finalizada"

export interface ClaseHoyCompleta {
  id: string
  titulo: string
  nivel: string | null
  horaInicio: string
  horaFin: string
  lugar: string | null
  academiaNombre: string | null
  profesor: string | null
  inscritos: number
  cupoMaximo: number | null
  asistencias: number
  estado: EstadoClaseHoy
}

const ETIQUETA_ESTADO: Record<EstadoClaseHoy, string> = {
  cancelada: "Cancelada",
  proxima: "Próxima",
  en_curso: "En curso",
  finalizada: "Finalizada",
}

const VARIANTE_ESTADO: Record<EstadoClaseHoy, "muted" | "default" | "success" | "warning"> = {
  cancelada: "muted",
  proxima: "default",
  en_curso: "warning",
  finalizada: "success",
}

export function ClassCard({ clase }: { clase: ClaseHoyCompleta }) {
  const ocupacionPct = clase.cupoMaximo ? Math.min(100, (clase.inscritos / clase.cupoMaximo) * 100) : null

  return (
    <div className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold uppercase tracking-wide text-text">{clase.titulo}</p>
          <p className="text-xs text-text-muted">
            {clase.horaInicio} – {clase.horaFin}
            {clase.nivel ? ` · ${clase.nivel}` : ""}
          </p>
        </div>
        <Badge variant={VARIANTE_ESTADO[clase.estado]}>{ETIQUETA_ESTADO[clase.estado]}</Badge>
      </div>

      <p className="text-xs text-text-muted">
        {[clase.academiaNombre, clase.lugar].filter(Boolean).join(" · ") || "Sin sede"}
      </p>
      {clase.profesor && <p className="text-xs text-text-muted">Profesor: {clase.profesor}</p>}

      {clase.estado !== "cancelada" && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>
              {clase.inscritos}
              {clase.cupoMaximo ? ` / ${clase.cupoMaximo} alumnos` : " alumnos"}
            </span>
            <span>{clase.asistencias} asistencias registradas</span>
          </div>
          {ocupacionPct != null && (
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-hover">
              <div className="h-full rounded-full bg-brand" style={{ width: `${ocupacionPct}%` }} />
            </div>
          )}
        </div>
      )}

      {clase.estado !== "cancelada" && (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin/calendario">Ver clase</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin/asistencia">
              {clase.estado === "finalizada" ? "Ver asistencia" : "Registrar asistencia"}
            </Link>
          </Button>
        </div>
      )}
    </div>
  )
}
