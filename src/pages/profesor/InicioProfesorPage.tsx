import { useEffect, useState } from "react"
import { Link } from "react-router-dom"

import { Card, CardContent } from "@/components/ui/card"
import { useAuth } from "@/context/AuthContext"
import { fechaHoy } from "@/lib/attendance"
import { formatearMoneda } from "@/lib/format"
import { cargarResumenFinanciero, type ResumenFinancieroProfesor } from "@/lib/teacherFinance"
import { supabase } from "@/lib/supabase"

interface ClaseHoy {
  hora: string
  titulo: string
  lugar: string | null
}

interface FilaHoy {
  class_occurrences: {
    fecha: string
    hora: string
    class_series: { titulo: string; lugar: string | null } | { titulo: string; lugar: string | null }[] | null
  } | null
}

export function InicioProfesorPage() {
  const { profile } = useAuth()
  const [clasesHoy, setClasesHoy] = useState<ClaseHoy[]>([])
  const [resumen, setResumen] = useState<ResumenFinancieroProfesor | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    async function cargar() {
      if (!profile?.id) return
      setCargando(true)
      const hoy = new Date()

      const [{ data: filas }, resumenData] = await Promise.all([
        supabase
          .from("class_occurrence_teachers")
          .select("class_occurrences(fecha, hora, class_series(titulo, lugar))")
          .eq("profesor_id", profile.id)
          .eq("estado_asistencia", "programada"),
        cargarResumenFinanciero(profile.id, hoy.getFullYear(), hoy.getMonth() + 1),
      ])

      const hoyISO = fechaHoy()
      const filasHoy = ((filas as unknown as FilaHoy[]) ?? []).filter(
        (f) => f.class_occurrences?.fecha === hoyISO,
      )
      setClasesHoy(
        filasHoy
          .map((f) => {
            const serie = Array.isArray(f.class_occurrences?.class_series)
              ? f.class_occurrences?.class_series[0]
              : f.class_occurrences?.class_series
            return {
              hora: f.class_occurrences!.hora,
              titulo: serie?.titulo ?? "Clase",
              lugar: serie?.lugar ?? null,
            }
          })
          .sort((a, b) => a.hora.localeCompare(b.hora)),
      )
      setResumen(resumenData)
      setCargando(false)
    }

    cargar()
  }, [profile?.id])

  if (cargando) return <p className="text-sm text-text-muted">Cargando...</p>

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-text">Hola, {profile?.nombre}</h1>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-text-muted">Clases de hoy</p>
        {clasesHoy.length === 0 ? (
          <Card>
            <CardContent className="py-4 text-center text-sm text-text-muted">
              No tienes clases hoy.
            </CardContent>
          </Card>
        ) : (
          clasesHoy.map((c, i) => (
            <Card key={i}>
              <CardContent className="py-3">
                <p className="font-medium text-text">
                  {c.hora.slice(0, 5)} · {c.titulo}
                </p>
                {c.lugar && <p className="text-xs text-text-muted">{c.lugar}</p>}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {resumen && (
        <Link to="/profesor/finanzas" className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-text-muted">Este mes</p>
          <div className="grid grid-cols-2 gap-3">
            <Card className="border-l-4 border-l-success">
              <CardContent className="py-4">
                <p className="mb-1 text-xs uppercase tracking-wider text-text-muted">Generado</p>
                <p className="text-xl font-bold text-success">{formatearMoneda(resumen.generado)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <p className="mb-1 text-xs uppercase tracking-wider text-text-muted">
                  Pendiente por pagar
                </p>
                <p className="text-xl font-bold text-text">
                  {formatearMoneda(resumen.pendiente_por_pagar)}
                </p>
              </CardContent>
            </Card>
          </div>
        </Link>
      )}
    </div>
  )
}
