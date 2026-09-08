import { Ticket } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { Card, CardContent } from "@/components/ui/card"
import { useAuth } from "@/context/AuthContext"
import { aFechaISO } from "@/lib/calendarGrid"
import { fechaHoy } from "@/lib/attendance"
import { supabase } from "@/lib/supabase"

interface ClaseHoy {
  id: string
  hora: string
  titulo: string
  lugar: string | null
  profesor: string | null
}

export function InicioPage() {
  const { profile } = useAuth()
  const [nombre, setNombre] = useState("")
  const [clasesHoy, setClasesHoy] = useState<ClaseHoy[]>([])
  const [totalClasesSemana, setTotalClasesSemana] = useState(0)
  const [totalEventosSemana, setTotalEventosSemana] = useState(0)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    async function cargar() {
      if (!profile?.id) return
      setCargando(true)

      const { data: alumno } = await supabase
        .from("students")
        .select("nombre, academia_id")
        .eq("id", profile.id)
        .single()

      setNombre(alumno?.nombre?.split(" ")[0] ?? "")

      const hoy = fechaHoy()
      const en7Dias = new Date()
      en7Dias.setDate(en7Dias.getDate() + 6)
      const finSemana = aFechaISO(en7Dias)

      const [{ data: teachersData }, { data: ocurrenciasSemana }, { count: eventosCount }] =
        await Promise.all([
          supabase.from("teachers").select("id, nombre"),
          alumno?.academia_id
            ? supabase
                .from("class_occurrences")
                .select("id, fecha, hora, class_series(titulo, lugar, profesor_ids)")
                .eq("academia_id", alumno.academia_id)
                .eq("estado", "programada")
                .gte("fecha", hoy)
                .lte("fecha", finSemana)
                .order("hora")
            : Promise.resolve({ data: [] }),
          supabase
            .from("events")
            .select("id", { count: "exact", head: true })
            .gte("fecha", hoy)
            .lte("fecha", finSemana),
        ])

      const profesoresPorId = new Map((teachersData ?? []).map((t) => [t.id as string, t.nombre as string]))

      type Fila = {
        id: string
        fecha: string
        hora: string
        class_series: { titulo: string; lugar: string | null; profesor_ids: string[] } | null
      }
      const filas = (ocurrenciasSemana as Fila[] | null) ?? []

      setClasesHoy(
        filas
          .filter((f) => f.fecha === hoy)
          .map((f) => ({
            id: f.id,
            hora: f.hora,
            titulo: f.class_series?.titulo ?? "Clase",
            lugar: f.class_series?.lugar ?? null,
            profesor:
              (f.class_series?.profesor_ids ?? [])
                .map((id) => profesoresPorId.get(id))
                .filter(Boolean)
                .join(", ") || null,
          })),
      )
      setTotalClasesSemana(filas.length)
      setTotalEventosSemana(eventosCount ?? 0)

      setCargando(false)
    }

    cargar()
  }, [profile?.id])

  const saludo = useMemo(() => {
    const hora = new Date().getHours()
    if (hora < 12) return "Buenos días"
    if (hora < 19) return "Buenas tardes"
    return "Buenas noches"
  }, [])

  if (cargando) return <p className="text-sm text-text-muted">Cargando...</p>

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-text">
          {saludo}
          {nombre ? `, ${nombre}` : ""}
        </h1>
        <p className="text-sm text-text-muted">Esto es lo que tienes en Dance Manager.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-text-muted">Esta semana tienes</p>
            <p className="text-xl font-bold text-text">
              {totalClasesSemana} {totalClasesSemana === 1 ? "clase" : "clases"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-text-muted">Esta semana tienes</p>
            <p className="text-xl font-bold text-text">
              {totalEventosSemana} {totalEventosSemana === 1 ? "evento" : "eventos"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-text-muted">Hoy</p>
        {clasesHoy.length === 0 ? (
          <Card>
            <CardContent className="py-4 text-center text-sm text-text-muted">
              No tienes clases programadas para hoy.
            </CardContent>
          </Card>
        ) : (
          clasesHoy.map((clase) => (
            <Card key={clase.id}>
              <CardContent className="flex items-center gap-3 py-3">
                <Ticket className="size-5 shrink-0 text-brand-light" />
                <div>
                  <p className="font-medium text-text">
                    {clase.hora.slice(0, 5)} · {clase.titulo}
                  </p>
                  <p className="text-xs text-text-muted">
                    {clase.profesor ? `${clase.profesor}` : ""}
                    {clase.profesor && clase.lugar ? " · " : ""}
                    {clase.lugar ?? ""}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
