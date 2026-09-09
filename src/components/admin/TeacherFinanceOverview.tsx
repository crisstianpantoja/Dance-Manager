import { useMemo } from "react"
import { Link } from "react-router-dom"

import { Card, CardContent } from "@/components/ui/card"
import { formatearMoneda } from "@/lib/format"
import type { FinanzasProfesorResumen } from "@/lib/dashboardSummary"

export function TeacherFinanceOverview({ finanzas }: { finanzas: FinanzasProfesorResumen[] }) {
  const totales = useMemo(
    () =>
      finanzas.reduce(
        (acc, f) => ({
          clases: acc.clases + f.clases,
          generado: acc.generado + f.generado,
          pagado: acc.pagado + f.pagado,
          pendiente: acc.pendiente + f.pendiente,
        }),
        { clases: 0, generado: 0, pagado: 0, pendiente: 0 },
      ),
    [finanzas],
  )

  const pendientes = useMemo(
    () => finanzas.filter((f) => f.pendiente > 0).sort((a, b) => b.pendiente - a.pendiente),
    [finanzas],
  )

  return (
    <Card className="h-full">
      <CardContent className="flex flex-col gap-4 py-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-text">Finanzas de profesores</h2>
          <Link to="/admin/finanzas-profesores" className="text-xs font-medium text-brand-light hover:underline">
            Ver todo →
          </Link>
        </div>

        {finanzas.length === 0 ? (
          <p className="py-2 text-sm text-text-muted">Sin clases dictadas este mes todavía.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div>
                <p className="text-lg font-bold text-text">{totales.clases}</p>
                <p className="text-xs text-text-muted">clases impartidas</p>
              </div>
              <div>
                <p className="text-lg font-bold text-text">{formatearMoneda(totales.generado)}</p>
                <p className="text-xs text-text-muted">generado</p>
              </div>
              <div>
                <p className="text-lg font-bold text-success">{formatearMoneda(totales.pagado)}</p>
                <p className="text-xs text-text-muted">pagado</p>
              </div>
              <div>
                <p className="text-lg font-bold text-warning">{formatearMoneda(totales.pendiente)}</p>
                <p className="text-xs text-text-muted">pendiente</p>
              </div>
            </div>

            {pendientes.length > 0 && (
              <div className="flex flex-col gap-2 border-t border-border pt-3">
                {pendientes.map((f) => (
                  <div key={f.profesor_id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="text-text">{f.nombre}</p>
                      <p className="text-xs text-text-muted">
                        {f.clases} clase{f.clases === 1 ? "" : "s"} · {formatearMoneda(f.tarifa_promedio)} c/u
                      </p>
                    </div>
                    <p className="font-medium text-warning">{formatearMoneda(f.pendiente)}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
