import { Pencil, Plus, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"

import { EventFormDialog } from "@/pages/admin/EventFormDialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { formatearFecha } from "@/lib/format"
import { supabase } from "@/lib/supabase"
import type { EventoDM } from "@/types/event"

export function EventsPage() {
  const [eventos, setEventos] = useState<EventoDM[]>([])
  const [cargando, setCargando] = useState(true)
  const [dialogoAbierto, setDialogoAbierto] = useState(false)
  const [eventoEditando, setEventoEditando] = useState<EventoDM | null>(null)

  async function cargar() {
    setCargando(true)
    const { data } = await supabase.from("events").select("*").order("fecha")
    setEventos((data as EventoDM[]) ?? [])
    setCargando(false)
  }

  useEffect(() => {
    cargar()
  }, [])

  function abrirCrear() {
    setEventoEditando(null)
    setDialogoAbierto(true)
  }

  function abrirEditar(evento: EventoDM) {
    setEventoEditando(evento)
    setDialogoAbierto(true)
  }

  async function eliminar(evento: EventoDM) {
    if (!confirm(`¿Eliminar el evento "${evento.titulo}"?`)) return
    const { error } = await supabase.from("events").delete().eq("id", evento.id)
    if (error) {
      alert("No se pudo eliminar el evento.")
      return
    }
    cargar()
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text">Eventos</h1>
        <Button onClick={abrirCrear} size="sm">
          <Plus className="size-4" />
          Nuevo evento
        </Button>
      </div>

      {cargando ? (
        <p className="text-sm text-text-muted">Cargando...</p>
      ) : eventos.length === 0 ? (
        <p className="text-sm text-text-muted">Aún no hay eventos creados.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {eventos.map((evento) => (
            <Card key={evento.id}>
              <CardContent className="flex items-center justify-between gap-3 py-3">
                <div className="flex items-center gap-3">
                  {evento.imagen_url && (
                    <img
                      src={evento.imagen_url}
                      alt=""
                      className="size-12 shrink-0 rounded-control object-cover"
                    />
                  )}
                  <div>
                    <p className="font-medium text-text">{evento.titulo}</p>
                    <p className="text-xs text-text-muted">
                      {formatearFecha(evento.fecha)} · {evento.hora.slice(0, 5)}
                      {evento.lugar ? ` · ${evento.lugar}` : ""}
                    </p>
                    {evento.cupo_maximo && (
                      <Badge variant="muted" className="mt-1">
                        {evento.reservas.length}/{evento.cupo_maximo} reservas
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => abrirEditar(evento)}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => eliminar(evento)}>
                    <Trash2 className="size-4 text-error" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <EventFormDialog
        open={dialogoAbierto}
        onOpenChange={setDialogoAbierto}
        evento={eventoEditando}
        onSaved={cargar}
      />
    </div>
  )
}
