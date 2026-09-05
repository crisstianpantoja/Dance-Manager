import { useEffect, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useAuth } from "@/context/AuthContext"
import { fechaHoy } from "@/lib/attendance"
import { formatearFecha } from "@/lib/format"
import { gestionarReserva } from "@/lib/studentPortal"
import { supabase } from "@/lib/supabase"
import type { OcurrenciaConSerie } from "@/types/classSeries"
import type { EventoDM } from "@/types/event"

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

export function ReservasPage() {
  const { profile } = useAuth()
  const [ocurrencias, setOcurrencias] = useState<OcurrenciaConSerie[]>([])
  const [eventos, setEventos] = useState<EventoDM[]>([])
  const [cargando, setCargando] = useState(true)
  const [procesando, setProcesando] = useState<string | null>(null)

  async function cargarDatos() {
    if (!profile?.id) return
    setCargando(true)

    const { data: alumno } = await supabase
      .from("students")
      .select("academia_id")
      .eq("id", profile.id)
      .single()

    const hoy = fechaHoy()

    const [{ data: ocurrenciasData }, { data: eventosData }] = await Promise.all([
      alumno?.academia_id
        ? supabase
            .from("class_occurrences")
            .select("*, class_series(titulo, categoria, lugar, cupo_maximo)")
            .eq("academia_id", alumno.academia_id)
            .eq("estado", "programada")
            .gte("fecha", hoy)
            .order("fecha")
            .order("hora")
            .limit(50)
        : Promise.resolve({ data: [] as FilaOcurrencia[] }),
      supabase.from("events").select("*").gte("fecha", hoy).order("fecha").order("hora"),
    ])

    const filas = (ocurrenciasData as FilaOcurrencia[] | null) ?? []
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
    setEventos((eventosData as EventoDM[]) ?? [])
    setCargando(false)
  }

  useEffect(() => {
    cargarDatos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id])

  async function toggleClase(oc: OcurrenciaConSerie) {
    if (!profile?.id) return
    const reservado = oc.alumno_ids.includes(profile.id)
    setProcesando(oc.id)
    try {
      await gestionarReserva(reservado ? "cancelar_clase" : "reservar_clase", oc.id)
      cargarDatos()
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo procesar la reserva.")
    } finally {
      setProcesando(null)
    }
  }

  async function toggleEvento(evento: EventoDM) {
    if (!profile?.id) return
    const reservado = evento.reservas.includes(profile.id)
    setProcesando(evento.id)
    try {
      await gestionarReserva(reservado ? "cancelar_evento" : "reservar_evento", evento.id)
      cargarDatos()
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo procesar la reserva.")
    } finally {
      setProcesando(null)
    }
  }

  if (cargando) return <p className="text-sm text-text-muted">Cargando...</p>

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-text">Reservas</h1>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-text-muted">Clases</p>
        {ocurrencias.length === 0 ? (
          <Card>
            <CardContent className="py-4 text-center text-sm text-text-muted">
              No hay clases disponibles para reservar.
            </CardContent>
          </Card>
        ) : (
          ocurrencias.map((oc) => {
            const reservado = profile?.id ? oc.alumno_ids.includes(profile.id) : false
            const lleno = oc.cupo_maximo ? oc.alumno_ids.length >= oc.cupo_maximo : false

            return (
              <Card key={oc.id}>
                <CardContent className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-text">
                      {formatearFecha(oc.fecha)} · {oc.hora.slice(0, 5)}
                    </p>
                    <p className="text-xs text-text-muted">
                      {oc.titulo}
                      {oc.lugar ? ` · ${oc.lugar}` : ""}
                      {oc.cupo_maximo ? ` · ${oc.alumno_ids.length}/${oc.cupo_maximo} cupos` : ""}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={reservado ? "outline" : "default"}
                    disabled={procesando === oc.id || (!reservado && lleno)}
                    onClick={() => toggleClase(oc)}
                  >
                    {reservado ? "Cancelar" : lleno ? "Sin cupo" : "Reservar"}
                  </Button>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-text-muted">Eventos</p>
        {eventos.length === 0 ? (
          <Card>
            <CardContent className="py-4 text-center text-sm text-text-muted">
              No hay eventos próximos.
            </CardContent>
          </Card>
        ) : (
          eventos.map((evento) => {
            const reservado = profile?.id ? evento.reservas.includes(profile.id) : false
            const lleno = evento.cupo_maximo ? evento.reservas.length >= evento.cupo_maximo : false

            return (
              <Card key={evento.id}>
                <CardContent className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-text">{evento.titulo}</p>
                    <p className="text-xs text-text-muted">
                      {formatearFecha(evento.fecha)} · {evento.hora.slice(0, 5)}
                      {evento.lugar ? ` · ${evento.lugar}` : ""}
                    </p>
                    {evento.cupo_maximo && (
                      <Badge variant="muted" className="mt-1">
                        {evento.reservas.length}/{evento.cupo_maximo} cupos
                      </Badge>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant={reservado ? "outline" : "default"}
                    disabled={procesando === evento.id || (!reservado && lleno)}
                    onClick={() => toggleEvento(evento)}
                  >
                    {reservado ? "Cancelar" : lleno ? "Sin cupo" : "Reservar"}
                  </Button>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
