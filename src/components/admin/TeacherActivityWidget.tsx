import { useNavigate } from "react-router-dom"

import { MarketingDashboard } from "@/components/ui/dashboard-1"
import type { FinanzasProfesorResumen } from "@/lib/dashboardSummary"
import type { Teacher } from "@/types/teacher"

interface TeacherActivityWidgetProps {
  finanzas: FinanzasProfesorResumen[]
  profesores: Teacher[]
}

export function TeacherActivityWidget({ finanzas, profesores }: TeacherActivityWidgetProps) {
  const navigate = useNavigate()

  const totalClases = finanzas.reduce((acc, f) => acc + f.clases, 0)
  const totalGenerado = finanzas.reduce((acc, f) => acc + f.generado, 0)
  const totalPagado = finanzas.reduce((acc, f) => acc + f.pagado, 0)
  const totalPendiente = finanzas.reduce((acc, f) => acc + f.pendiente, 0)

  const pctPagado = totalGenerado > 0 ? Math.round((totalPagado / totalGenerado) * 100) : 0
  const pctPendiente = totalGenerado > 0 ? Math.round((totalPendiente / totalGenerado) * 100) : 0

  const activos = profesores.filter((p) => p.activo)

  return (
    <MarketingDashboard
      className="max-w-none"
      title="Actividad del equipo docente"
      activityLabel="Clases del periodo"
      teamLabel="Profesores"
      teamActivities={{
        totalHours: totalClases,
        unitLabel: "clases",
        stats: [
          { label: "Pagado", value: pctPagado, color: "bg-success" },
          { label: "Pendiente", value: pctPendiente, color: "bg-warning" },
        ],
      }}
      team={{
        memberCount: activos.length,
        unitLabel: "activos",
        members: activos.slice(0, 4).map((p) => ({
          id: p.id,
          name: p.nombre,
          avatarUrl: p.foto ?? "",
        })),
      }}
      cta={{
        text: "Gestiona las finanzas de tus profesores",
        buttonText: "Ver todo",
        onButtonClick: () => navigate("/admin/finanzas-profesores"),
      }}
    />
  )
}
