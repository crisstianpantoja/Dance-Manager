import { useEffect, useMemo, useState } from "react"

import { MonthNavHeader } from "@/components/calendar/MonthNavHeader"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { useAuth } from "@/context/AuthContext"
import { fechaHoy } from "@/lib/attendance"
import {
  construirGrillaMensual,
  DIAS_CORTOS,
  mesAnterior,
  mesSiguiente,
  NOMBRES_MES,
  primerDiaDelMesActual,
} from "@/lib/calendarGrid"
import { etiquetaClase, formatearFechaLarga } from "@/lib/format"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import type { NivelAlumno } from "@/types/student"

interface OcurrenciaProfesor {
  id: string
  fecha: string
  hora: string
  titulo: string
  lugar: string | null
  nivel: NivelAlumno | null
  cupoMaximo: number | null
  estado: string
}

interface FilaCruda {
  class_occurrences: {
    id: string
    fecha: string
    hora: string
    estado: string
    class_series:
      | { titulo: string; lugar: string | null; nivel: NivelAlumno | null; cupo_maximo: number | null }
      | { titulo: string; lugar: string | null; nivel: NivelAlumno | null; cupo_maximo: number | null }[]
      | null
  } | null
}

export function CalendarioProfesorPage() {
  const { profile } = useAuth()
  const [fechaBase, setFechaBase] = useState(() => primerDiaDelMesActual())
  const [diaSeleccionado, setDiaSeleccionado] = useState(() => fechaHoy())
  const [ocurrencias, setOcurrencias] = useState<OcurrenciaProfesor[]>([])
  const [cargando, setCargando] = useState(true)

  const celdas = useMemo(
    () => construirGrillaMensual(fechaBase.getFullYear(), fechaBase.getMonth()),
    [fechaBase],
  )

  useEffect(() => {
    const desde = celdas[0]?.fecha
    const hasta = celdas[celdas.length - 1]?.fecha
    if (!desde || !hasta) return
    if (diaSeleccionado >= desde && diaSeleccionado <= hasta) return
    const hoy = fechaHoy()
    setDiaSeleccionado(hoy >= desde && hoy <= hasta ? hoy : (celdas.find((c) => c.enMes)?.fecha ?? desde))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [celdas])

  useEffect(() => {
    async function cargar() {
      if (!profile?.id) return
      setCargando(true)

      const { data } = await supabase
        .from("class_occurrence_teachers")
        .select("class_occurrences(id, fecha, hora, estado, class_series(titulo, lugar, nivel, cupo_maximo))")
        .eq("profesor_id", profile.id)

      const filas = ((data as unknown as FilaCruda[]) ?? [])
        .filter((f) => f.class_occurrences)
        .map((f) => {
          const serie = Array.isArray(f.class_occurrences?.class_series)
            ? f.class_occurrences?.class_series[0]
            : f.class_occurrences?.class_series
          return {
            id: f.class_occurrences!.id,
            fecha: f.class_occurrences!.fecha,
            hora: f.class_occurrences!.hora,
            estado: f.class_occurrences!.estado,
            titulo: serie?.titulo ?? "Clase",
            lugar: serie?.lugar ?? null,
            nivel: serie?.nivel ?? null,
            cupoMaximo: serie?.cupo_maximo ?? null,
          }
        })
        .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora))

      setOcurrencias(filas)
      setCargando(false)
    }

    cargar()
  }, [profile?.id])

  const porFecha = useMemo(() => {
    const mapa = new Map<string, OcurrenciaProfesor[]>()
    for (const oc of ocurrencias) {
      const lista = mapa.get(oc.fecha) ?? []
      lista.push(oc)
      mapa.set(oc.fecha, lista)
    }
    return mapa
  }, [ocurrencias])

  function irAnterior() {
    setFechaBase((actual) => mesAnterior(actual))
  }
  function irSiguiente() {
    setFechaBase((actual) => mesSiguiente(actual))
  }
  function irHoy() {
    setFechaBase(primerDiaDelMesActual())
  }

  const itemsDia = (porFecha.get(diaSeleccionado) ?? []).slice().sort((a, b) => a.hora.localeCompare(b.hora))
  const etiquetaPeriodo = `${NOMBRES_MES[fechaBase.getMonth()]} ${fechaBase.getFullYear()}`

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-text">Mi calendario</h1>

      <MonthNavHeader etiqueta={etiquetaPeriodo} onAnterior={irAnterior} onSiguiente={irSiguiente} onHoy={irHoy} />

      {cargando ? (
        <p className="text-sm text-text-muted">Cargando...</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr] lg:items-start">
          <div className="overflow-hidden rounded-control border border-white/10">
            <div className="grid grid-cols-7 border-b border-white/10 bg-surface">
              {DIAS_CORTOS.map((dia) => (
                <div
                  key={dia}
                  className="py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-text-muted sm:text-xs"
                >
                  {dia}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {celdas.map((celda) => {
                const seleccionado = celda.fecha === diaSeleccionado
                const items = porFecha.get(celda.fecha) ?? []
                const punto =
                  items.length === 0 ? null : items.some((i) => i.estado !== "cancelada") ? "bg-brand" : "bg-white/30"
                return (
                  <button
                    key={celda.fecha}
                    type="button"
                    onClick={() => setDiaSeleccionado(celda.fecha)}
                    className={cn(
                      "flex flex-col items-center gap-1 border-b border-r border-white/5 py-2.5 transition-colors last:border-r-0",
                      celda.enMes ? "bg-background" : "bg-surface/40",
                      seleccionado && "bg-brand/5",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-7 items-center justify-center rounded-full text-xs font-medium transition-colors",
                        seleccionado
                          ? "bg-brand text-white"
                          : celda.esHoy
                            ? "border border-brand text-brand-light"
                            : celda.enMes
                              ? "text-text"
                              : "text-text-muted/50",
                      )}
                    >
                      {celda.dia}
                    </span>
                    <span className={cn("size-1.5 rounded-full", punto ?? "bg-transparent")} />
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold capitalize text-text-muted">
              Clases del {formatearFechaLarga(diaSeleccionado)}
            </p>

            {itemsDia.length === 0 ? (
              <Card>
                <CardContent className="py-4 text-center text-sm text-text-muted">
                  No tienes clases programadas este día.
                </CardContent>
              </Card>
            ) : (
              <div className="flex flex-col">
                {itemsDia.map((oc, indice) => {
                  const etiqueta = etiquetaClase(oc.nivel, oc.cupoMaximo)
                  return (
                    <div key={oc.id} className="flex gap-3">
                      <span className="w-11 shrink-0 pt-2.5 text-right text-xs font-semibold text-text">
                        {oc.hora.slice(0, 5)}
                      </span>
                      <div className="flex flex-col items-center">
                        <span
                          className={cn(
                            "mt-3 size-2.5 shrink-0 rounded-full",
                            oc.estado === "cancelada" ? "bg-white/30" : "bg-brand",
                          )}
                        />
                        {indice < itemsDia.length - 1 && <span className="w-px flex-1 bg-white/10" />}
                      </div>
                      <div
                        className={cn(
                          "mb-3 flex-1 rounded-control border px-3 py-2",
                          oc.estado === "cancelada"
                            ? "border-white/10 bg-surface/50 text-text-muted opacity-60"
                            : "border-brand/30 bg-brand/10 text-text",
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium">{oc.titulo}</p>
                          {etiqueta && (
                            <Badge variant={etiqueta.variant} className="shrink-0 px-2 py-0 text-[10px]">
                              {etiqueta.texto}
                            </Badge>
                          )}
                        </div>
                        {oc.lugar && <p className="text-xs opacity-80">{oc.lugar}</p>}
                        {oc.estado === "cancelada" && <p className="text-xs font-semibold">Cancelada</p>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
