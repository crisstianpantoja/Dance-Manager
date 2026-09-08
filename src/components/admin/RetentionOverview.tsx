import { Link } from "react-router-dom"

import { Card, CardContent } from "@/components/ui/card"
import type { SaludAcademia } from "@/lib/dashboardSummary"

export function RetentionOverview({ salud }: { salud: SaludAcademia }) {
  return (
    <Card className="h-full">
      <CardContent className="flex flex-col gap-2 py-4">
        <h2 className="font-semibold text-text">Retención</h2>
        <p className="text-2xl font-bold text-text">{salud.retencion_pct}%</p>

        <div className="flex flex-col gap-1.5 text-sm">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-success" />
            <span className="text-text-muted">{salud.frecuentes} alumnos frecuentes</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-warning" />
            <span className="text-text-muted">{salud.en_riesgo} en riesgo</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-error" />
            <span className="text-text-muted">{salud.inactivos} inactivos</span>
          </div>
        </div>

        <Link to="/admin/retencion" className="text-xs font-medium text-brand-light hover:underline">
          Ver alumnos en riesgo →
        </Link>
      </CardContent>
    </Card>
  )
}
