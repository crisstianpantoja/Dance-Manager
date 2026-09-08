import { Line, LineChart, ResponsiveContainer } from "recharts"
import { Link } from "react-router-dom"

import { Card, CardContent } from "@/components/ui/card"
import type { PuntoEvolucionAlumnos } from "@/lib/dashboardSummary"

interface StudentsOverviewProps {
  totales: number
  nuevos: number
  planesPorVencer: number
  pagosVencidos: number
  evolucion: PuntoEvolucionAlumnos[]
}

export function StudentsOverview({
  totales,
  nuevos,
  planesPorVencer,
  pagosVencidos,
  evolucion,
}: StudentsOverviewProps) {
  return (
    <Link to="/admin/alumnos">
      <Card className="h-full transition-colors hover:bg-surface-hover">
        <CardContent className="flex flex-col gap-2 py-4">
          <h2 className="font-semibold text-text">Alumnos</h2>
          <p className="text-2xl font-bold text-text">{totales} activos</p>

          <div className="flex flex-col gap-1 text-sm text-text-muted">
            {nuevos > 0 && <p>+{nuevos} nuevos este periodo</p>}
            {planesPorVencer > 0 && <p>{planesPorVencer} planes por vencer</p>}
            {pagosVencidos > 0 && <p>{pagosVencidos} sin renovar</p>}
          </div>

          {evolucion.length > 1 && (
            <div className="h-10 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={evolucion}>
                  <Line type="monotone" dataKey="total" stroke="#9542df" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
