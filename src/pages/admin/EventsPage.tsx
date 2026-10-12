import { Pencil, Plus, Trash2, X } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { EventFormDialog } from "@/pages/admin/EventFormDialog"
import { confirmDialog } from "@/components/ConfirmDialogHost"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/animated-modal"
import { Card } from "@/components/ui/card"
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
  const [eventoDetalleId, setEventoDetalleId] = useState<string | null>(null)
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
    setEventoDetalleId(null)
    setEventoEditando(evento)
    setDialogoAbierto(true)
  }

  async function eliminar(evento: EventoDM) {
    if (!(await confirmDialog(`¿Eliminar el evento "${evento.titulo}"?`, { destructive: true }))) return
    const { error } = await supabase.from("events").delete().eq("id", evento.id)
    if (error) {
      toast.error("No se pudo eliminar el evento.")
      return
    }
    setEventoDetalleId(null)
    cargar()
  }

  async function quitarInscrito(evento: EventoDM, alumnoId: string) {
    const nombre = datosAlumnos.get(alumnoId)?.nombre ?? "este alumno"
    if (!(await confirmDialog(`¿Quitar a ${nombre} de "${evento.titulo}"?`, { destructive: true }))) return

    setQuitando(alumnoId)
    const { error } = await supabase
      .from("events")
      .update({ reservas: evento.reservas.filter((id) => id !== alumnoId) })
      .eq("id", evento.id)
    setQuitando(null)

    if (error) {
      toast.error("No se pudo quitar la inscripción.")
      return
    }
    cargar()
  }

  const eventoDetalle = eventos.find((e) => e.id === eventoDetalleId) ?? null

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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {eventos.map((evento) => (
            <Card key={evento.id} className="overflow-hidden p-0">
              <button
                type="button"
                onClick={() => setEventoDetalleId(evento.id)}
                className="group relative block h-52 w-full text-left"
              >
                {evento.imagen_url ? (
                  <img
                    src={evento.imagen_url}
                    alt=""
                    className="absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-brand-dark via-brand to-brand-light" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />

                <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1.5 p-4">
                  <p className="font-heading text-xl font-black uppercase italic leading-tight tracking-tight text-white drop-shadow-sm">
                    {evento.titulo}
                  </p>
                  <p className="text-xs font-medium text-white/80">
                    {formatearFecha(evento.fecha)} · {evento.hora.slice(0, 5)}
                    {evento.lugar ? ` · ${evento.lugar}` : ""}
                  </p>
                  {evento.cupo_maximo && (
                    <Badge variant="muted" className="w-fit border-white/20 bg-white/15 text-white">
                      {evento.reservas.length}/{evento.cupo_maximo} reservas
                    </Badge>
                  )}
                </div>
              </button>
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

      <Modal open={!!eventoDetalle} onOpenChange={(open) => !open && setEventoDetalleId(null)}>
        <ModalBody className="max-h-[80vh]">
          {eventoDetalle && (
            <>
              <ModalHeader className="px-6 pt-6">
                <ModalTitle>{eventoDetalle.titulo}</ModalTitle>
              </ModalHeader>

              <ModalContent>
              {eventoDetalle.imagen_url && (
                <img
                  src={eventoDetalle.imagen_url}
                  alt=""
                  className="max-h-48 w-full rounded-control object-cover"
                />
              )}

              <div className="flex flex-col gap-1 text-sm">
                <p className="text-text">
                  {formatearFecha(eventoDetalle.fecha)} · {eventoDetalle.hora.slice(0, 5)}
                </p>
                {eventoDetalle.lugar && <p className="text-text-muted">Sede: {eventoDetalle.lugar}</p>}
                {eventoDetalle.profesores && (
                  <p className="text-text-muted">Profesores/artistas: {eventoDetalle.profesores}</p>
                )}
                {eventoDetalle.descripcion && (
                  <p className="text-text-muted">{eventoDetalle.descripcion}</p>
                )}
                {eventoDetalle.cupo_maximo && (
                  <Badge variant="muted" className="mt-1 w-fit">
                    {eventoDetalle.reservas.length}/{eventoDetalle.cupo_maximo} reservas
                  </Badge>
                )}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => abrirEditar(eventoDetalle)}>
                  <Pencil className="size-4" />
                  Editar
                </Button>
                <Button variant="outline" size="sm" onClick={() => eliminar(eventoDetalle)}>
                  <Trash2 className="size-4 text-error" />
                  Eliminar
                </Button>
              </div>

              {eventoDetalle.reservas.length > 0 && (
                <div className="flex flex-col gap-2 border-t border-border pt-4">
                  <p className="text-sm font-medium text-text">Inscritos</p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Alumno</TableHead>
                        <TableHead>Documento</TableHead>
                        <TableHead className="w-12 text-right">Quitar</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {eventoDetalle.reservas.map((id) => (
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
                              onClick={() => quitarInscrito(eventoDetalle, id)}
                            >
                              <X className="size-4 text-error" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              </ModalContent>
            </>
          )}
        </ModalBody>
      </Modal>
    </div>
  )
}
