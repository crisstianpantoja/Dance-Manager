import { TrendingDown, TrendingUp } from "lucide-react"
import { Link } from "react-router-dom"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface MetricCardProps {
  titulo: string
  valor: string
  nota?: string
  tendenciaPct?: number | null
  bienSiSube?: boolean
  accentClassName?: string
  valorClassName?: string
  to?: string
}

/** Tarjeta de KPI del Dashboard, con tendencia opcional vs. el periodo
 * anterior equivalente. "bienSiSube" decide si subir es una buena
 * noticia (ingresos) o mala (gastos) para pintar la flecha en verde/rojo. */
export function MetricCard({
  titulo,
  valor,
  nota,
  tendenciaPct,
  bienSiSube = true,
  accentClassName,
  valorClassName,
  to,
}: MetricCardProps) {
  const tieneTendencia = tendenciaPct != null && Number.isFinite(tendenciaPct)
  const subio = tieneTendencia && tendenciaPct! >= 0
  const esBuenaNoticia = tieneTendencia && subio === bienSiSube

  const contenido = (
    <Card className={cn(accentClassName && "border-l-4", accentClassName)}>
      <CardContent className="py-4">
        <p className="mb-1 text-xs uppercase tracking-wider text-text-muted">{titulo}</p>
        <p className={cn("text-2xl font-bold text-text", valorClassName)}>{valor}</p>
        {tieneTendencia ? (
          <p
            className={cn(
              "mt-1 flex items-center gap-1 text-xs font-medium",
              esBuenaNoticia ? "text-success" : "text-error",
            )}
          >
            {subio ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
            {Math.abs(tendenciaPct!).toFixed(0)}% vs. periodo anterior
          </p>
        ) : (
          nota && <p className="mt-1 text-xs text-text-muted">{nota}</p>
        )}
      </CardContent>
    </Card>
  )

  if (!to) return contenido
  return (
    <Link to={to} className="transition-opacity hover:opacity-90">
      {contenido}
    </Link>
  )
}
