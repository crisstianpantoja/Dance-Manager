import { useEffect, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { useAuth } from "@/context/AuthContext"
import { fechaHoy } from "@/lib/attendance"
import { formatearFecha } from "@/lib/format"
import { supabase } from "@/lib/supabase"

interface FilaOcurrencia {
  fecha: string
  hora: string
  titulo: string
  lugar: string | null
  estado: string
}

interface FilaCruda {
  class_occurrences: {
    fecha: string
    hora: string
    estado: string
    class_series: { titulo: string; lugar: string | null } | { titulo: string; lugar: string | null }[] | null
  } | null
}

export function CalendarioProfesorPage() {
  const { profile } = useAuth()
  const [ocurrencias, setOcurrencias] = useState<FilaOcurrencia[]>([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    async function cargar() {
      if (!profile?.id) return
      setCargando(true)

      const { data } = await supabase
        .from("class_occurrence_teachers")
        .select("class_occurrences(fecha, hora, estado, class_series(titulo, lugar))")
        .eq("profesor_id", profile.id)

      const hoy = fechaHoy()
      const filas = ((data as unknown as FilaCruda[]) ?? [])
        .filter((f) => f.class_occurrences && f.class_occurrences.fecha >= hoy)
        .map((f) => {
          const serie = Array.isArray(f.class_occurrences?.class_series)
            ? f.class_occurrences?.class_series[0]
            : f.class_occurrences?.class_series
          return {
            fecha: f.class_occurrences!.fecha,
            hora: f.class_occurrences!.hora,
            estado: f.class_occurrences!.estado,
            titulo: serie?.titulo ?? "Clase",
            lugar: serie?.lugar ?? null,
          }
        })
        .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora))

      setOcurrencias(filas)
      setCargando(false)
    }

    cargar()
  }, [profile?.id])

  const porFecha = ocurrencias.reduce<Record<string, FilaOcurrencia[]>>((acc, oc) => {
    acc[oc.fecha] = acc[oc.fecha] ?? []
    acc[oc.fecha].push(oc)
    return acc
  }, {})

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-text">Mi calendario</h1>

      {cargando ? (
        <p className="text-sm text-text-muted">Cargando...</p>
      ) : Object.keys(porFecha).length === 0 ? (
        <Card>
          <CardContent className="py-6 text-center text-sm text-text-muted">
            No tienes clases próximas asignadas.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          {Object.entries(porFecha).map(([fecha, filas]) => (
            <div key={fecha} className="flex flex-col gap-2">
              <p className="text-sm font-semibold text-text-muted">{formatearFecha(fecha)}</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {filas.map((oc, i) => (
                  <Card key={i} className={oc.estado === "cancelada" ? "opacity-50" : ""}>
                    <CardContent className="flex items-center justify-between gap-2 py-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-text">
                          {oc.hora.slice(0, 5)} · {oc.titulo}
                        </p>
                        {oc.lugar && <p className="text-xs text-text-muted">{oc.lugar}</p>}
                      </div>
                      {oc.estado === "cancelada" && (
                        <Badge variant="muted" className="shrink-0">
                          Cancelada
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
