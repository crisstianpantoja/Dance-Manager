import { useEffect, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { fechaHoy } from "@/lib/attendance"
import { formatearFecha, formatearMoneda } from "@/lib/format"
import { supabase } from "@/lib/supabase"
import { confirmarPagoCanceladaExcepcional } from "@/lib/teacherAttendance"
import type { OcurrenciaConSerie } from "@/types/classSeries"

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

export function CalendarPage() {
  const [ocurrencias, setOcurrencias] = useState<OcurrenciaConProfesores[]>([])
  const [cargando, setCargando] = useState(true)
  const [procesando, setProcesando] = useState<string | null>(null)

  async function cargarOcurrencias() {
    setCargando(true)
    const { data } = await supabase
      .from("class_occurrences")
      .select(
        "*, class_series(titulo, categoria, cupo_maximo, lugar), class_occurrence_teachers(profesor_id, estado_asistencia, valor_previsto, metodo_registro, teachers(nombre))",
      )
      .gte("fecha", fechaHoy())
      .order("fecha")
      .order("hora")
      .limit(200)

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
  }, [])

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

  const porFecha = ocurrencias.reduce<Record<string, OcurrenciaConProfesores[]>>((acc, oc) => {
    acc[oc.fecha] = acc[oc.fecha] ?? []
    acc[oc.fecha].push(oc)
    return acc
  }, {})

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-text">Calendario</h1>

      {cargando ? (
        <p className="text-sm text-text-muted">Cargando...</p>
      ) : ocurrencias.length === 0 ? (
        <p className="text-sm text-text-muted">
          No hay clases programadas próximamente. Crea una clase recurrente para que
          aparezca aquí.
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {Object.entries(porFecha).map(([fecha, filas]) => (
            <div key={fecha} className="flex flex-col gap-2">
              <p className="text-sm font-semibold text-text-muted">{formatearFecha(fecha)}</p>
              <div className="flex flex-col gap-2">
                {filas.map((oc) => (
                  <div
                    key={oc.id}
                    className={
                      "flex flex-col gap-2 rounded-control border border-white/10 bg-surface px-4 py-3 " +
                      (oc.estado === "cancelada" ? "opacity-90" : "")
                    }
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
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
