import { useEffect, useState } from "react"

import { CompetencyRadar } from "@/components/alumno/CompetencyRadar"
import { Card, CardContent } from "@/components/ui/card"
import { useAuth } from "@/context/AuthContext"
import { listarEvaluaciones } from "@/lib/evaluations"
import { formatearFecha } from "@/lib/format"
import type { StudentEvaluation } from "@/types/evaluation"

export function EvaluacionesPage() {
  const { profile } = useAuth()
  const [evaluaciones, setEvaluaciones] = useState<StudentEvaluation[]>([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    async function cargar() {
      if (!profile?.id) return
      setCargando(true)
      const datos = await listarEvaluaciones(profile.id).catch(() => [] as StudentEvaluation[])
      setEvaluaciones(datos)
      setCargando(false)
    }

    cargar()
  }, [profile?.id])

  if (cargando) return <p className="text-sm text-text-muted">Cargando...</p>

  const ultimaEvaluacion = evaluaciones[0] ?? null
  const notasEvaluaciones = evaluaciones.filter((evaluacion) => evaluacion.nota?.trim())

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-text">Mis evaluaciones</h1>

      <Card>
        <CardContent className="flex flex-col gap-4 py-4">
          {ultimaEvaluacion ? (
            <>
              <CompetencyRadar evaluacion={ultimaEvaluacion} />
              {notasEvaluaciones.length > 0 && (
                <div className="flex flex-col gap-3 border-t border-border pt-4">
                  <p className="text-sm font-medium text-text">Notas del profesor</p>
                  {notasEvaluaciones.map((evaluacion) => (
                    <div key={evaluacion.id} className="flex flex-col gap-1">
                      <p className="text-xs text-text-muted">{formatearFecha(evaluacion.fecha)}</p>
                      <p className="text-sm text-text">{evaluacion.nota}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="py-2 text-center text-sm text-text-muted">
              Aún no tienes evaluaciones registradas.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
