import { useEffect, useState } from "react"

import { Card, CardContent } from "@/components/ui/card"
import { useAuth } from "@/context/AuthContext"
import { fechaHoy } from "@/lib/attendance"
import { formatearFecha } from "@/lib/format"
import { supabase } from "@/lib/supabase"
import type { OcurrenciaConSerie } from "@/types/classSeries"

interface FilaOcurrencia {
  id: string
  serie_id: string
  academia_id: string | null
  fecha: string
  hora: string
  alumno_ids: string[]
  class_series: {
    titulo: string
    categoria: string | null
    lugar: string | null
    cupo_maximo: number | null
  } | null
}

export function MisClasesPage() {
  const { profile } = useAuth()
  const [ocurrencias, setOcurrencias] = useState<OcurrenciaConSerie[]>([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    async function cargar() {
      if (!profile?.id) return
      setCargando(true)

      const { data: seriesPropias } = await supabase
        .from("class_series")
        .select("id")
        .contains("profesor_ids", [profile.id])

      const serieIds = (seriesPropias ?? []).map((s) => s.id)

      if (serieIds.length === 0) {
        setOcurrencias([])
        setCargando(false)
        return
      }

      const { data } = await supabase
        .from("class_occurrences")
        .select("*, class_series(titulo, categoria, lugar, cupo_maximo)")
        .in("serie_id", serieIds)
        .eq("estado", "programada")
        .gte("fecha", fechaHoy())
        .order("fecha")
        .order("hora")
        .limit(100)

      const filas = (data as FilaOcurrencia[] | null) ?? []
      setOcurrencias(
        filas.map((f) => ({
          id: f.id,
          serie_id: f.serie_id,
          academia_id: f.academia_id,
          fecha: f.fecha,
          hora: f.hora,
          alumno_ids: f.alumno_ids,
          estado: "programada",
          titulo: f.class_series?.titulo ?? "Clase",
          categoria: f.class_series?.categoria ?? null,
          cupo_maximo: f.class_series?.cupo_maximo ?? null,
          lugar: f.class_series?.lugar ?? null,
        })),
      )
      setCargando(false)
    }

    cargar()
  }, [profile?.id])

  const porFecha = ocurrencias.reduce<Record<string, OcurrenciaConSerie[]>>((acc, oc) => {
    acc[oc.fecha] = acc[oc.fecha] ?? []
    acc[oc.fecha].push(oc)
    return acc
  }, {})

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-text">Mis clases</h1>

      {cargando ? (
        <p className="text-sm text-text-muted">Cargando...</p>
      ) : Object.keys(porFecha).length === 0 ? (
        <p className="text-sm text-text-muted">
          No tienes clases asignadas próximamente. Pídele al admin que te asigne en el
          calendario.
        </p>
      ) : (
        Object.entries(porFecha).map(([fecha, filas]) => (
          <div key={fecha} className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-text-muted">{formatearFecha(fecha)}</p>
            {filas.map((oc) => (
              <Card key={oc.id}>
                <CardContent className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-text">
                      {oc.hora.slice(0, 5)} · {oc.titulo}
                    </p>
                    <p className="text-xs text-text-muted">
                      {oc.categoria ?? "Sin categoría"}
                      {oc.lugar ? ` · ${oc.lugar}` : ""}
                      {oc.cupo_maximo ? ` · ${oc.alumno_ids.length}/${oc.cupo_maximo} cupos` : ""}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ))
      )}
    </div>
  )
}
