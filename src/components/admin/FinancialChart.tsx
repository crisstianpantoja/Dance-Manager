import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis } from "recharts"

import { Card, CardContent } from "@/components/ui/card"
import { formatearMoneda } from "@/lib/format"
import type { PuntoTendenciaFinanciera } from "@/lib/dashboardSummary"

const NOMBRES_MES_CORTO = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
]

function etiquetaMes(mes: string): string {
  const fecha = new Date(`${mes}T00:00:00`)
  return NOMBRES_MES_CORTO[fecha.getMonth()]
}

function TooltipPersonalizado({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-control border border-white/10 bg-surface px-3 py-2 text-xs shadow-xl">
      <p className="mb-1 font-semibold text-text">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {formatearMoneda(p.value)}
        </p>
      ))}
    </div>
  )
}

export function FinancialChart({ datos }: { datos: PuntoTendenciaFinanciera[] }) {
  const totales = datos.reduce(
    (acc, d) => ({ ingresos: acc.ingresos + d.ingresos, gastos: acc.gastos + d.gastos }),
    { ingresos: 0, gastos: 0 },
  )
  const utilidad = totales.ingresos - totales.gastos

  const datosGrafico = datos.map((d) => ({
    mes: etiquetaMes(d.mes),
    Ingresos: d.ingresos,
    Gastos: d.gastos,
  }))

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 py-4">
        <h2 className="font-semibold text-text">Ingresos vs. gastos</h2>

        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={datosGrafico} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
              <XAxis dataKey="mes" tick={{ fill: "#a39eba", fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip content={<TooltipPersonalizado />} />
              <Line type="monotone" dataKey="Ingresos" stroke="#37d9a6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Gastos" stroke="#f05576" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-3 gap-3 border-t border-white/10 pt-3 text-center">
          <div>
            <p className="text-xs text-text-muted">Ingresos</p>
            <p className="font-semibold text-success">{formatearMoneda(totales.ingresos)}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted">Gastos</p>
            <p className="font-semibold text-error">{formatearMoneda(totales.gastos)}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted">Utilidad</p>
            <p className={`font-semibold ${utilidad >= 0 ? "text-success" : "text-error"}`}>
              {formatearMoneda(utilidad)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
