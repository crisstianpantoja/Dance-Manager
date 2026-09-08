import { ChevronLeft, ChevronRight } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { formatearFecha, formatearMoneda } from "@/lib/format"
import { supabase } from "@/lib/supabase"
import { confirmarPagoCanceladaExcepcional } from "@/lib/teacherAttendance"
import { cn } from "@/lib/utils"
import type { OcurrenciaConSerie } from "@/types/classSeries"
import type { NivelAlumno } from "@/types/student"

const NOMBRES_MES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
] as const

const DIAS_CORTOS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"] as const

interface ProfesorAsignado {
  profesor_id: string
  nombre: string
  estado_asistencia: string
  valor_previsto: number | null
  metodo_registro: string | null
}

interface OcurrenciaConProfesores extends OcurrenciaConSerie {
  profesores: ProfesorAsignado[]
}

interface FilaOcurrencia {
  id: string
  serie_id: string
  academia_id: string | null
  fecha: string
  hora: string
  alumno_ids: string[]
  estado: "programada" | "cancelada"
  class_series: {
    titulo: string
    categoria: string | null
    nivel: NivelAlumno | null
    cupo_maximo: number | null
    lugar: string | null
  } | null
  class_occurrence_teachers: {
    profesor_id: string
    estado_asistencia: string
    valor_previsto: number | null
    metodo_registro: string | null
    teachers: { nombre: string } | { nombre: string }[] | null
  }[]
}

function aFechaISO(fecha: Date): string {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(
    fecha.getDate(),
  ).padStart(2, "0")}`
}

interface CeldaCalendario {
  fecha: string
  dia: number
  enMes: boolean
  esHoy: boolean
}

function construirGrilla(anio: number, mes: number): CeldaCalendario[] {
  const primerDia = new Date(anio, mes, 1)
  const ultimoDia = new Date(anio, mes + 1, 0)
  const inicioGrilla = new Date(primerDia)
  inicioGrilla.setDate(inicioGrilla.getDate() - primerDia.getDay())
  const finGrilla = new Date(ultimoDia)
  finGrilla.setDate(finGrilla.getDate() + (6 - ultimoDia.getDay()))

  const hoyISO = aFechaISO(new Date())
  const celdas: CeldaCalendario[] = []
  const cursor = new Date(inicioGrilla)
  while (cursor <= finGrilla) {
    const fechaISO = aFechaISO(cursor)
    celdas.push({
      fecha: fechaISO,
      dia: cursor.getDate(),
      enMes: cursor.getMonth() === mes,
      esHoy: fechaISO === hoyISO,
    })
    cursor.setDate(cursor.getDate() + 1)
  }
  return celdas
}

export function CalendarPage() {
  const [mesVisible, setMesVisible] = useState(() => {
    const hoy = new Date()
    return new Date(hoy.getFullYear(), hoy.getMonth(), 1)
  })
  const [ocurrencias, setOcurrencias] = useState<OcurrenciaConProfesores[]>([])
  const [cargando, setCargando] = useState(true)
  const [procesando, setProcesando] = useState<string | null>(null)
  const [diaSeleccionado, setDiaSeleccionado] = useState<string | null>(null)

  const celdas = useMemo(
    () => construirGrilla(mesVisible.getFullYear(), mesVisible.getMonth()),
    [mesVisible],
  )

  async function cargarOcurrencias() {
    setCargando(true)
    const desde = celdas[0]?.fecha ?? aFechaISO(mesVisible)
    const hasta = celdas[celdas.length - 1]?.fecha ?? aFechaISO(mesVisible)

    const { data } = await supabase
      .from("class_occurrences")
      .select(
        "*, class_series(titulo, categoria, nivel, cupo_maximo, lugar), class_occurrence_teachers(profesor_id, estado_asistencia, valor_previsto, metodo_registro, teachers(nombre))",
      )
      .gte("fecha", desde)
      .lte("fecha", hasta)
      .order("fecha")
      .order("hora")
      .limit(500)

    const filas = (data as unknown as FilaOcurrencia[] | null) ?? []
    setOcurrencias(
      filas.map((f) => ({
        id: f.id,
        serie_id: f.serie_id,
        academia_id: f.academia_id,
        fecha: f.fecha,
        hora: f.hora,
        alumno_ids: f.alumno_ids,
        estado: f.estado,
        titulo: f.class_series?.titulo ?? "Clase",
        categoria: f.class_series?.categoria ?? null,
        nivel: f.class_series?.nivel ?? null,
        cupo_maximo: f.class_series?.cupo_maximo ?? null,
        lugar: f.class_series?.lugar ?? null,
        profesores: (f.class_occurrence_teachers ?? []).map((cot) => {
          const profesor = Array.isArray(cot.teachers) ? (cot.teachers[0] ?? null) : cot.teachers
          return {
            profesor_id: cot.profesor_id,
            nombre: profesor?.nombre ?? "Profesor",
            estado_asistencia: cot.estado_asistencia,
            valor_previsto: cot.valor_previsto,
            metodo_registro: cot.metodo_registro,
          }
        }),
      })),
    )
    setCargando(false)
  }

  useEffect(() => {
    cargarOcurrencias()
  }, [mesVisible])

  const ocurrenciasPorFecha = useMemo(() => {
    const mapa = new Map<string, OcurrenciaConProfesores[]>()
    for (const oc of ocurrencias) {
      const lista = mapa.get(oc.fecha) ?? []
      lista.push(oc)
      mapa.set(oc.fecha, lista)
    }
    return mapa
  }, [ocurrencias])

  async function pagarExcepcional(occurrenceId: string, profesorId: string) {
    if (!confirm("¿Pagar esta clase cancelada de todas formas?")) return
    setProcesando(occurrenceId)
    try {
      await confirmarPagoCanceladaExcepcional(occurrenceId, profesorId)
      cargarOcurrencias()
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo registrar el pago excepcional.")
    } finally {
      setProcesando(null)
    }
  }

  async function cambiarEstado(oc: OcurrenciaConSerie, estado: "programada" | "cancelada") {
    setProcesando(oc.id)
    const { error } = await supabase
      .from("class_occurrences")
      .update({ estado })
      .eq("id", oc.id)
    setProcesando(null)

    if (error) {
      alert("No se pudo actualizar la clase.")
      return
    }
    cargarOcurrencias()
  }

  function irAMesAnterior() {
    setMesVisible((actual) => new Date(actual.getFullYear(), actual.getMonth() - 1, 1))
  }

  function irAMesSiguiente() {
    setMesVisible((actual) => new Date(actual.getFullYear(), actual.getMonth() + 1, 1))
  }

  function irAHoy() {
    const hoy = new Date()
    setMesVisible(new Date(hoy.getFullYear(), hoy.getMonth(), 1))
  }

  const ocurrenciasDelDia = diaSeleccionado ? (ocurrenciasPorFecha.get(diaSeleccionado) ?? []) : []

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-text">Calendario</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={irAHoy}>
            Hoy
          </Button>
          <div className="flex items-center rounded-control border border-white/15">
            <button
              type="button"
              onClick={irAMesAnterior}
              className="p-2 text-text-muted transition-colors hover:text-text"
              title="Mes anterior"
            >
              <ChevronLeft className="size-4" />
            </button>
            <p className="min-w-36 text-center text-sm font-medium text-text">
              {NOMBRES_MES[mesVisible.getMonth()]} {mesVisible.getFullYear()}
            </p>
            <button
              type="button"
              onClick={irAMesSiguiente}
              className="p-2 text-text-muted transition-colors hover:text-text"
              title="Mes siguiente"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {cargando ? (
        <p className="text-sm text-text-muted">Cargando...</p>
      ) : (
        <div className="overflow-hidden rounded-control border border-white/10">
          <div className="grid grid-cols-7 border-b border-white/10 bg-surface">
            {DIAS_CORTOS.map((dia) => (
              <div
                key={dia}
                className="py-2 text-center text-xs font-semibold uppercase tracking-wider text-text-muted"
              >
                {dia}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {celdas.map((celda) => {
              const clasesDelDia = ocurrenciasPorFecha.get(celda.fecha) ?? []
              const visibles = clasesDelDia.slice(0, 3)
              const restantes = clasesDelDia.length - visibles.length

              return (
                <button
                  key={celda.fecha}
                  type="button"
                  onClick={() => clasesDelDia.length > 0 && setDiaSeleccionado(celda.fecha)}
                  className={cn(
                    "flex min-h-24 flex-col gap-1 border-b border-r border-white/5 p-1.5 text-left transition-colors last:border-r-0 sm:min-h-28",
                    celda.enMes ? "bg-background" : "bg-surface/40",
                    clasesDelDia.length > 0 && "cursor-pointer hover:bg-surface-hover",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-6 items-center justify-center rounded-full text-xs font-medium",
                      celda.esHoy
                        ? "bg-brand text-white"
                        : celda.enMes
                          ? "text-text"
                          : "text-text-muted/50",
                    )}
                  >
                    {celda.dia}
                  </span>

                  <div className="flex flex-col gap-0.5">
                    {visibles.map((oc) => (
                      <span
                        key={oc.id}
                        className={cn(
                          "truncate rounded px-1.5 py-0.5 text-[10px] font-medium",
                          oc.estado === "cancelada"
                            ? "bg-white/5 text-text-muted line-through"
                            : "bg-brand/15 text-brand-light",
                        )}
                      >
                        {oc.hora.slice(0, 5)} {oc.titulo}
                      </span>
                    ))}
                    {restantes > 0 && (
                      <span className="px-1.5 text-[10px] text-text-muted">
                        +{restantes} más
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <Dialog open={!!diaSeleccionado} onOpenChange={(open) => !open && setDiaSeleccionado(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {diaSeleccionado ? formatearFecha(diaSeleccionado) : ""}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            {ocurrenciasDelDia.map((oc) => (
              <div
                key={oc.id}
                className={cn(
                  "flex flex-col gap-2 rounded-control border border-white/10 bg-surface px-4 py-3",
                  oc.estado === "cancelada" && "opacity-90",
                )}
              >
                <div className="flex items-center justify-between">
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
                  <div className="flex items-center gap-2">
                    {oc.estado === "cancelada" ? (
                      <Badge variant="muted">Cancelada</Badge>
                    ) : (
                      <Badge variant="success">Programada</Badge>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={procesando === oc.id}
                      onClick={() =>
                        cambiarEstado(oc, oc.estado === "cancelada" ? "programada" : "cancelada")
                      }
                    >
                      {oc.estado === "cancelada" ? "Reactivar" : "Cancelar"}
                    </Button>
                  </div>
                </div>

                {oc.estado === "cancelada" && oc.profesores.length > 0 && (
                  <div className="flex flex-col gap-1 border-t border-white/10 pt-2">
                    {oc.profesores.map((p) => (
                      <div key={p.profesor_id} className="flex items-center justify-between text-xs">
                        <span className="text-text-muted">
                          {p.nombre}
                          {p.valor_previsto != null ? ` · ${formatearMoneda(p.valor_previsto)}` : ""}
                        </span>
                        {p.metodo_registro === "cancelacion_pagada" ? (
                          <Badge variant="success">Pagada</Badge>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={procesando === oc.id || p.valor_previsto == null}
                            onClick={() => pagarExcepcional(oc.id, p.profesor_id)}
                          >
                            Pagar de todas formas
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
