import { AlertTriangle, Clock, Music, UserX, Wallet } from "lucide-react"
import type { ComponentType } from "react"
import { Link } from "react-router-dom"

import { Card, CardContent } from "@/components/ui/card"
import { formatearMoneda } from "@/lib/format"
import type { AlertaDashboard, TipoAlertaDashboard } from "@/lib/dashboardSummary"

interface ConfigAlerta {
  icono: ComponentType<{ className?: string }>
  colorClassName: string
  ruta: string
  titulo: (a: AlertaDashboard) => string
  detalle?: (a: AlertaDashboard) => string | null
}

function plural(n: number, singular: string, plural: string) {
  return n === 1 ? singular : plural
}

const CONFIG: Record<TipoAlertaDashboard, ConfigAlerta> = {
  pagos_pendientes: {
    icono: Clock,
    colorClassName: "text-warning",
    ruta: "/admin/pagos",
    titulo: (a) => `${a.conteo} comprobante${plural(a.conteo ?? 0, "", "s")} por verificar`,
    detalle: (a) => (a.monto ? formatearMoneda(a.monto) : null),
  },
  sin_renovar: {
    icono: AlertTriangle,
    colorClassName: "text-error",
    ruta: "/admin/retencion",
    titulo: (a) => `${a.conteo} alumno${plural(a.conteo ?? 0, "", "s")} sin renovar`,
  },
  planes_por_vencer: {
    icono: Clock,
    colorClassName: "text-warning",
    ruta: "/admin/pagos",
    titulo: (a) =>
      `${a.conteo} plan${plural(a.conteo ?? 0, "", "es")} ${plural(a.conteo ?? 0, "vence", "vencen")} esta semana`,
  },
  alumnos_inactivos: {
    icono: UserX,
    colorClassName: "text-text-muted",
    ruta: "/admin/alumnos",
    titulo: (a) => `${a.conteo} alumno${plural(a.conteo ?? 0, "", "s")} sin asistir hace más de 14 días`,
  },
  profesor_pendiente: {
    icono: Wallet,
    colorClassName: "text-brand-light",
    ruta: "/admin/finanzas-profesores",
    titulo: (a) => `${a.conteo} profesor${plural(a.conteo ?? 0, "", "es")} con pago pendiente`,
    detalle: (a) => (a.monto ? formatearMoneda(a.monto) : null),
  },
  contratos_sin_pagar: {
    icono: Music,
    colorClassName: "text-warning",
    ruta: "/admin/contratos",
    titulo: (a) => `${a.conteo} contrato${plural(a.conteo ?? 0, "", "s")} confirmado${plural(a.conteo ?? 0, "", "s")} sin pagar`,
    detalle: (a) => (a.monto ? formatearMoneda(a.monto) : null),
  },
}

export function DashboardAlerts({ alertas }: { alertas: AlertaDashboard[] }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 py-4">
        <h2 className="mb-2 font-semibold text-text">Alertas</h2>
        {alertas.length === 0 ? (
          <p className="py-2 text-sm text-text-muted">Todo en orden, no hay nada que requiera tu atención.</p>
        ) : (
          alertas.map((alerta) => {
            const config = CONFIG[alerta.tipo]
            if (!config) return null
            const Icono = config.icono
            const detalle = config.detalle?.(alerta)
            return (
              <Link
                key={alerta.tipo}
                to={config.ruta}
                className="flex items-center gap-3 rounded-control px-2 py-2.5 transition-colors hover:bg-surface-hover"
              >
                <Icono className={`size-4 shrink-0 ${config.colorClassName}`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-text">{config.titulo(alerta)}</p>
                  {detalle && <p className="text-xs text-text-muted">{detalle}</p>}
                </div>
              </Link>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
