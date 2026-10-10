import { Pencil, Plus, Trash2, Users, X } from "lucide-react"
import { useEffect, useState } from "react"

import { EventFormDialog } from "@/pages/admin/EventFormDialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatearFecha } from "@/lib/format"
import { supabase } from "@/lib/supabase"
import type { EventoDM } from "@/types/event"

interface DatosAlumno {
  nombre: string
  documento: string
}

export function EventsPage() {
  const [eventos, setEventos] = useState<EventoDM[]>([])
  const [datosAlumnos, setDatosAlumnos] = useState<Map<string, DatosAlumno>>(new Map())
  const [cargando, setCargando] = useState(true)
  const [dialogoAbierto, setDialogoAbierto] = useState(false)
  const [eventoEditando, setEventoEditando] = useState<EventoDM | null>(null)
  const [eventoInscritosId, setEventoInscritosId] = useState<string | null>(null)
  const [quitando, setQuitando] = useState<string | null>(null)

  async function cargar() {
    setCargando(true)
    const { data } = await supabase.from("events").select("*").order("fecha")
    const eventosData = (data as EventoDM[]) ?? []
    setEventos(eventosData)

    const idsAlumnos = [...new Set(eventosData.flatMap((e) => e.reservas))]
    if (idsAlumnos.length > 0) {
      const { data: alumnosData } = await supabase
        .from("students")
        .select("id, nombre, documento")
        .in("id", idsAlumnos)
      setDatosAlumnos(
        new Map(
          (alumnosData ?? []).map((a) => [
            a.id as string,
            { nombre: a.nombre as string, documento: a.documento as string },
          ]),
        ),
      )
    } else {
      setDatosAlumnos(new Map())
    }

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

  async function quitarInscrito(evento: EventoDM, alumnoId: string) {
    const nombre = datosAlumnos.get(alumnoId)?.nombre ?? "este alumno"
    if (!confirm(`¿Quitar a ${nombre} de "${evento.titulo}"?`)) return

    setQuitando(alumnoId)
    const { error } = await supabase
      .from("events")
      .update({ reservas: evento.reservas.filter((id) => id !== alumnoId) })
      .eq("id", evento.id)
    setQuitando(null)

    if (error) {
      alert("No se pudo quitar la inscripción.")
      return
    }
    cargar()
  }

  const eventoInscritos = eventos.find((e) => e.id === eventoInscritosId) ?? null

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
                <div className="flex items-center gap-1">
                  {evento.reservas.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEventoInscritosId(evento.id)}
                    >
                      <Users className="size-4" />
                      Ver inscritos
                    </Button>
                  )}
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

      <Dialog open={!!eventoInscritos} onOpenChange={(open) => !open && setEventoInscritosId(null)}>
        <DialogContent>
          {eventoInscritos && (
            <>
              <DialogHeader>
                <DialogTitle>Inscritos · {eventoInscritos.titulo}</DialogTitle>
              </DialogHeader>

              <p className="text-xs text-text-muted">
                {formatearFecha(eventoInscritos.fecha)} · {eventoInscritos.hora.slice(0, 5)}
                {eventoInscritos.cupo_maximo
                  ? ` · ${eventoInscritos.reservas.length}/${eventoInscritos.cupo_maximo} cupos`
                  : ""}
              </p>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Alumno</TableHead>
                    <TableHead>Documento</TableHead>
                    <TableHead className="w-12 text-right">Quitar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eventoInscritos.reservas.map((id) => (
                    <TableRow key={id}>
                      <TableCell className="font-medium text-text">
                        {datosAlumnos.get(id)?.nombre ?? "Alumno"}
                      </TableCell>
                      <TableCell className="text-text-muted">
                        {datosAlumnos.get(id)?.documento ?? "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={quitando === id}
                          onClick={() => quitarInscrito(eventoInscritos, id)}
                        >
                          <X className="size-4 text-error" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
