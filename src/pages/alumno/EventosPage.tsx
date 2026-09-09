import { useEffect, useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useAuth } from "@/context/AuthContext"
import { fechaHoy } from "@/lib/attendance"
import { formatearFecha, formatearMoneda } from "@/lib/format"
import { gestionarReserva } from "@/lib/studentPortal"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import type { EventoDM } from "@/types/event"

type SubTab = "explorar" | "misEventos"

export function EventosPage() {
  const { profile } = useAuth()
  const [subTab, setSubTab] = useState<SubTab>("explorar")

  const [eventosFuturos, setEventosFuturos] = useState<EventoDM[]>([])
  const [misEventos, setMisEventos] = useState<EventoDM[]>([])
  const [cargando, setCargando] = useState(true)
  const [procesando, setProcesando] = useState<string | null>(null)
  const [eventoSeleccionado, setEventoSeleccionado] = useState<EventoDM | null>(null)

  async function cargarDatos() {
    if (!profile?.id) return
    setCargando(true)
    const hoy = fechaHoy()

    const [{ data: futurosData }, { data: misData }] = await Promise.all([
      supabase.from("events").select("*").gte("fecha", hoy).order("fecha").order("hora"),
      supabase
        .from("events")
        .select("*")
        .contains("reservas", [profile.id])
        .order("fecha", { ascending: false }),
    ])

    setEventosFuturos((futurosData as EventoDM[]) ?? [])
    setMisEventos((misData as EventoDM[]) ?? [])
    setCargando(false)
  }

  useEffect(() => {
    cargarDatos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id])

  const hoy = fechaHoy()
  const misProximos = useMemo(
    () => misEventos.filter((e) => e.fecha >= hoy).sort((a, b) => a.fecha.localeCompare(b.fecha)),
    [misEventos, hoy],
  )
  const miHistorial = useMemo(() => misEventos.filter((e) => e.fecha < hoy), [misEventos, hoy])

  async function toggleEvento(evento: EventoDM) {
    if (!profile?.id) return
    const reservado = evento.reservas.includes(profile.id)
    setProcesando(evento.id)
    try {
      await gestionarReserva(reservado ? "cancelar_evento" : "reservar_evento", evento.id)
      await cargarDatos()
      setEventoSeleccionado(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo procesar la inscripción.")
    } finally {
      setProcesando(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-text">Eventos</h1>

      <div className="flex items-center gap-1 rounded-control border border-border-strong p-1">
        {(
          [
            ["explorar", "Explorar"],
            ["misEventos", "Mis eventos"],
          ] as [SubTab, string][]
        ).map(([valor, etiqueta]) => (
          <button
            key={valor}
            type="button"
            onClick={() => setSubTab(valor)}
            className={cn(
              "flex-1 rounded-[0.5rem] py-2 text-sm font-medium transition-colors",
              subTab === valor ? "bg-brand text-white" : "text-text-muted hover:text-text",
            )}
          >
            {etiqueta}
          </button>
        ))}
      </div>

      {cargando ? (
        <p className="text-sm text-text-muted">Cargando...</p>
      ) : subTab === "explorar" ? (
        eventosFuturos.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-sm text-text-muted">
              No hay eventos disponibles por ahora.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {eventosFuturos.map((evento) => {
              const inscrito = profile?.id ? evento.reservas.includes(profile.id) : false
              const lleno = evento.cupo_maximo ? evento.reservas.length >= evento.cupo_maximo : false

              return (
                <Card key={evento.id} className="overflow-hidden">
                  {evento.imagen_url && (
                    <img src={evento.imagen_url} alt="" className="h-36 w-full object-cover" />
                  )}
                  <CardContent className="flex flex-col gap-2 py-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-text">{evento.titulo}</p>
                      {inscrito && <Badge variant="success">Inscrito</Badge>}
                    </div>
                    <p className="text-xs text-text-muted">
                      {formatearFecha(evento.fecha)} · {evento.hora.slice(0, 5)}
                      {evento.lugar ? ` · ${evento.lugar}` : ""}
                    </p>
                    <div className="flex items-center gap-2">
                      {evento.precio != null && (
                        <Badge variant="muted">{formatearMoneda(evento.precio)}</Badge>
                      )}
                      {evento.cupo_maximo && (
                        <Badge variant={lleno ? "muted" : "default"}>
                          {evento.reservas.length}/{evento.cupo_maximo} cupos
                        </Badge>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-1 self-start"
                      onClick={() => setEventoSeleccionado(evento)}
                    >
                      Ver evento
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-text-muted">Próximos</p>
            {misProximos.length === 0 ? (
              <Card>
                <CardContent className="py-4 text-center text-sm text-text-muted">
                  Aún no te has inscrito a ningún evento.
                </CardContent>
              </Card>
            ) : (
              misProximos.map((evento) => (
                <Card key={evento.id}>
                  <CardContent className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium text-text">{evento.titulo}</p>
                      <p className="text-xs text-text-muted">
                        {formatearFecha(evento.fecha)} · {evento.hora.slice(0, 5)}
                        {evento.lugar ? ` · ${evento.lugar}` : ""}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={procesando === evento.id}
                      onClick={() => toggleEvento(evento)}
                    >
                      Cancelar
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-text-muted">Historial</p>
            {miHistorial.length === 0 ? (
              <Card>
                <CardContent className="py-4 text-center text-sm text-text-muted">
                  Todavía no has participado en ningún evento.
                </CardContent>
              </Card>
            ) : (
              miHistorial.map((evento) => (
                <Card key={evento.id} className="opacity-80">
                  <CardContent className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium text-text">{evento.titulo}</p>
                      <p className="text-xs text-text-muted">
                        {formatearFecha(evento.fecha)} · {evento.hora.slice(0, 5)}
                        {evento.lugar ? ` · ${evento.lugar}` : ""}
                      </p>
                    </div>
                    <Badge variant="muted">Finalizado</Badge>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      <Dialog open={!!eventoSeleccionado} onOpenChange={(open) => !open && setEventoSeleccionado(null)}>
        <DialogContent>
          {eventoSeleccionado && (
            <>
              <DialogHeader>
                <DialogTitle>{eventoSeleccionado.titulo}</DialogTitle>
              </DialogHeader>

              {eventoSeleccionado.imagen_url && (
                <img
                  src={eventoSeleccionado.imagen_url}
                  alt=""
                  className="max-h-48 w-full rounded-control object-cover"
                />
              )}

              <div className="flex flex-col gap-2 text-sm">
                <p className="text-text">
                  {formatearFecha(eventoSeleccionado.fecha)} · {eventoSeleccionado.hora.slice(0, 5)}
                </p>
                {eventoSeleccionado.lugar && (
                  <p className="text-text-muted">Sede: {eventoSeleccionado.lugar}</p>
                )}
                {eventoSeleccionado.profesores && (
                  <p className="text-text-muted">
                    Profesores/artistas: {eventoSeleccionado.profesores}
                  </p>
                )}
                {eventoSeleccionado.descripcion && (
                  <p className="text-text-muted">{eventoSeleccionado.descripcion}</p>
                )}
                <div className="flex items-center gap-2">
                  <Badge variant="muted">
                    {eventoSeleccionado.precio != null
                      ? formatearMoneda(eventoSeleccionado.precio)
                      : "Gratis"}
                  </Badge>
                  {eventoSeleccionado.cupo_maximo && (
                    <Badge variant="muted">
                      {eventoSeleccionado.reservas.length}/{eventoSeleccionado.cupo_maximo} cupos
                    </Badge>
                  )}
                  {profile?.id && eventoSeleccionado.reservas.includes(profile.id) && (
                    <Badge variant="success">Inscrito</Badge>
                  )}
                </div>
              </div>

              <Button
                className="mt-2"
                variant={
                  profile?.id && eventoSeleccionado.reservas.includes(profile.id)
                    ? "outline"
                    : "default"
                }
                disabled={
                  procesando === eventoSeleccionado.id ||
                  (!(profile?.id && eventoSeleccionado.reservas.includes(profile.id)) &&
                    !!eventoSeleccionado.cupo_maximo &&
                    eventoSeleccionado.reservas.length >= eventoSeleccionado.cupo_maximo)
                }
                onClick={() => toggleEvento(eventoSeleccionado)}
              >
                {profile?.id && eventoSeleccionado.reservas.includes(profile.id)
                  ? "Cancelar inscripción"
                  : eventoSeleccionado.cupo_maximo &&
                      eventoSeleccionado.reservas.length >= eventoSeleccionado.cupo_maximo
                    ? "Sin cupo"
                    : "Inscribirme"}
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
