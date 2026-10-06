import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts"

import type { StudentEvaluation } from "@/types/evaluation"

interface CompetencyRadarProps {
  evaluacion: StudentEvaluation
}

export function CompetencyRadar({ evaluacion }: CompetencyRadarProps) {
  const datos = [
    { eje: "Ritmo", valor: evaluacion.ritmo },
    { eje: "Movimiento", valor: evaluacion.movimiento },
    { eje: "Imagen", valor: evaluacion.imagen },
    { eje: "Conexión", valor: evaluacion.conexion },
  ]

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={datos} outerRadius="75%">
          <PolarGrid stroke="var(--color-border)" />
          <PolarAngleAxis dataKey="eje" tick={{ fill: "var(--color-text-muted)", fontSize: 12 }} />
          <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
          <Radar
            dataKey="valor"
            stroke="var(--color-brand)"
            fill="var(--color-brand)"
            fillOpacity={0.35}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
