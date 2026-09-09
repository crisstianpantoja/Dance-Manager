import { useMemo } from "react"

import { Card, CardContent } from "@/components/ui/card"
import type { RendimientoClase } from "@/lib/dashboardSummary"

interface ClaseConTasa extends RendimientoClase {
  tasaAsistencia: number | null
}

export function ClassesPerformance({ clases }: { clases: RendimientoClase[] }) {
  const { totalClases, totalAsistencias, alumnosPromedio, ocupacionPromedio, mejores, peores } = useMemo(() => {
    const conTasa: ClaseConTasa[] = clases.map((c) => ({
      ...c,
      tasaAsistencia: c.inscritos > 0 ? Math.round((c.asistencias / c.inscritos) * 100) : null,
    }))

    const totalClases = clases.reduce((acc, c) => acc + c.clases_realizadas, 0)
    const totalAsistencias = clases.reduce((acc, c) => acc + c.asistencias, 0)
    const totalInscritos = clases.reduce((acc, c) => acc + c.inscritos, 0)

    let cupoPonderado = 0
    let inscritosConCupo = 0
    for (const c of clases) {
      if (c.cupo_maximo) {
        cupoPonderado += c.cupo_maximo * c.clases_realizadas
        inscritosConCupo += c.inscritos
      }
    }

    const conTasaValida = conTasa.filter((c) => c.tasaAsistencia != null)
    const ordenadas = [...conTasaValida].sort((a, b) => (b.tasaAsistencia ?? 0) - (a.tasaAsistencia ?? 0))

    return {
      totalClases,
      totalAsistencias,
      alumnosPromedio: totalClases > 0 ? Math.round(totalInscritos / totalClases) : 0,
      ocupacionPromedio: cupoPonderado > 0 ? Math.round((inscritosConCupo / cupoPonderado) * 100) : null,
      mejores: ordenadas.slice(0, 3),
      peores: ordenadas
        .slice(-3)
        .reverse()
        .filter((c) => (c.tasaAsistencia ?? 100) < 60),
    }
  }, [clases])

  if (clases.length === 0) {
    return (
      <Card className="h-full">
        <CardContent className="py-6 text-center text-sm text-text-muted">
          Todavía no hay clases realizadas en este periodo.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardContent className="flex flex-col gap-4 py-4">
        <h2 className="font-semibold text-text">Rendimiento de clases</h2>

        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <p className="text-lg font-bold text-text">{totalClases}</p>
            <p className="text-xs text-text-muted">clases realizadas</p>
          </div>
          <div>
            <p className="text-lg font-bold text-text">{totalAsistencias}</p>
            <p className="text-xs text-text-muted">asistencias</p>
          </div>
          <div>
            <p className="text-lg font-bold text-text">{alumnosPromedio}</p>
            <p className="text-xs text-text-muted">alumnos promedio</p>
          </div>
          <div>
            <p className="text-lg font-bold text-text">{ocupacionPromedio != null ? `${ocupacionPromedio}%` : "—"}</p>
            <p className="text-xs text-text-muted">ocupación promedio</p>
          </div>
        </div>

        {mejores.length > 0 && (
          <div className="flex flex-col gap-1.5 border-t border-border pt-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Mayor asistencia</p>
            {mejores.map((c) => (
              <div key={c.serie_id} className="flex items-center justify-between text-sm">
                <span className="text-text">{c.titulo}</span>
                <span className="font-medium text-success">{c.tasaAsistencia}%</span>
              </div>
            ))}
          </div>
        )}

        {peores.length > 0 && (
          <div className="flex flex-col gap-1.5 border-t border-border pt-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Baja asistencia</p>
            {peores.map((c) => (
              <div key={c.serie_id} className="flex items-center justify-between text-sm">
                <span className="text-text">{c.titulo}</span>
                <span className="font-medium text-error">{c.tasaAsistencia}%</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
