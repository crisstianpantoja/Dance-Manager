import { Link } from "react-router-dom"

import { Card, CardContent } from "@/components/ui/card"
import type { SaludAcademia } from "@/lib/dashboardSummary"
import { cn } from "@/lib/utils"

interface AcademyHealthProps {
  salud: SaludAcademia
  alertaTexto?: string | null
}

function etiquetaDeScore(score: number): { texto: string; className: string } {
  if (score >= 80) return { texto: "Buena", className: "text-success" }
  if (score >= 60) return { texto: "Regular", className: "text-warning" }
  return { texto: "Necesita atención", className: "text-error" }
}

const METRICAS = [
  { key: "retencion_pct", label: "Retención" },
  { key: "asistencia_pct", label: "Asistencia" },
  { key: "pagos_al_dia_pct", label: "Pagos al día" },
  { key: "ocupacion_pct", label: "Ocupación" },
] as const

export function AcademyHealth({ salud, alertaTexto }: AcademyHealthProps) {
  const { texto, className } = etiquetaDeScore(salud.score)
  const diferencia = salud.score - salud.score_prev

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 py-4">
        <h2 className="font-semibold text-text">Salud de la academia</h2>

        <div className="flex items-baseline gap-2">
          <p className="text-3xl font-bold text-text">{salud.score}</p>
          <p className="text-sm text-text-muted">/ 100</p>
          <p className={cn("text-sm font-semibold", className)}>{texto}</p>
        </div>

        {diferencia !== 0 && (
          <p className={cn("text-xs font-medium", diferencia > 0 ? "text-success" : "text-error")}>
            {diferencia > 0 ? "↑" : "↓"} {Math.abs(diferencia)} puntos vs. periodo anterior
          </p>
        )}

        <div className="flex flex-col gap-1.5 border-t border-border pt-3">
          {METRICAS.map((m) => (
            <div key={m.key} className="flex items-center justify-between text-sm">
              <span className="text-text-muted">{m.label}</span>
              <span className="font-medium text-text">{salud[m.key]}%</span>
            </div>
          ))}
        </div>

        {alertaTexto && (
          <p className="rounded-control bg-warning/10 px-3 py-2 text-xs text-warning">{alertaTexto}</p>
        )}

        <Link to="/admin/retencion" className="text-xs font-medium text-brand-light hover:underline">
          Ver alumnos en riesgo →
        </Link>
      </CardContent>
    </Card>
  )
}
