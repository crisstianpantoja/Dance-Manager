import { LogOut } from "lucide-react"
import { useEffect, useState } from "react"

import { Badge } from "@/components/ui/badge"
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
  class_series: { titulo: string; categoria: string | null; lugar: string | null } | null
}

export function StudentCalendarPage() {
  const { profile, signOut } = useAuth()
  const [ocurrencias, setOcurrencias] = useState<OcurrenciaConSerie[]>([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    async function cargar() {
      setCargando(true)

      const { data: alumno } = await supabase
        .from("students")
        .select("academia_id")
        .eq("id", profile?.id)
        .single()

      if (!alumno?.academia_id) {
        setOcurrencias([])
        setCargando(false)
        return
      }

      const { data } = await supabase
        .from("class_occurrences")
        .select("*, class_series(titulo, categoria, lugar)")
        .eq("academia_id", alumno.academia_id)
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
          cupo_maximo: null,
          lugar: f.class_series?.lugar ?? null,
        })),
      )
      setCargando(false)
    }

    if (profile?.id) cargar()
  }, [profile?.id])

  const porFecha = ocurrencias.reduce<Record<string, OcurrenciaConSerie[]>>((acc, oc) => {
    acc[oc.fecha] = acc[oc.fecha] ?? []
    acc[oc.fecha].push(oc)
    return acc
  }, {})

  return (
    <div className="min-h-dvh bg-background">
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div>
          <p className="text-lg font-bold leading-none text-text">Dance Manager</p>
          <p className="text-xs text-text-muted">{profile?.nombre}</p>
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-1.5 rounded-control px-3 py-2 text-sm text-text-muted transition-colors hover:bg-surface-hover hover:text-text"
        >
          <LogOut className="size-4" />
          Salir
        </button>
      </header>

      <main className="mx-auto flex max-w-lg flex-col gap-4 px-4 py-6">
        <h1 className="text-xl font-bold text-text">Calendario de tu academia</h1>

        {cargando ? (
          <p className="text-sm text-text-muted">Cargando...</p>
        ) : Object.keys(porFecha).length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-sm text-text-muted">
              Todavía no hay clases programadas para tu academia.
            </CardContent>
          </Card>
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
                      </p>
                    </div>
                    <Badge>Programada</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          ))
        )}
      </main>
    </div>
  )
}
