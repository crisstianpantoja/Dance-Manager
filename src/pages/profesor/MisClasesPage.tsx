import { useEffect, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { useAuth } from "@/context/AuthContext"
import { fechaHoy } from "@/lib/attendance"
import { cargarAlumnosConPlanPrivado, esOcurrenciaPrivada } from "@/lib/clasePrivada"
import { etiquetaClase, formatearFecha, formatearMoneda } from "@/lib/format"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import type { NivelAlumno } from "@/types/student"

type Pestana = "proximas" | "realizadas" | "canceladas"

interface Fila {
  fecha: string
  hora: string
  titulo: string
  lugar: string | null
  nivel: NivelAlumno | null
  alumnoIds: string[]
  estadoOcurrencia: string
  valorGenerado: number | null
  metodoRegistro: string | null
}

interface FilaCruda {
  valor_generado: number | null
  metodo_registro: string | null
  class_occurrences: {
    fecha: string
    hora: string
    estado: string
    alumno_ids: string[]
    class_series:
      | { titulo: string; lugar: string | null; nivel: NivelAlumno | null }
      | { titulo: string; lugar: string | null; nivel: NivelAlumno | null }[]
      | null
  } | null
}

const PESTANAS: { value: Pestana; label: string }[] = [
  { value: "proximas", label: "Próximas" },
  { value: "realizadas", label: "Realizadas" },
  { value: "canceladas", label: "Canceladas" },
]

export function MisClasesPage() {
  const { profile } = useAuth()
  const [pestana, setPestana] = useState<Pestana>("proximas")
  const [filas, setFilas] = useState<Fila[]>([])
  const [alumnosPrivados, setAlumnosPrivados] = useState<Set<string>>(new Set())
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    async function cargar() {
      if (!profile?.id) return
      setCargando(true)

      const { data } = await supabase
        .from("class_occurrence_teachers")
        .select(
          "valor_generado, metodo_registro, class_occurrences(fecha, hora, estado, alumno_ids, class_series(titulo, lugar, nivel))",
        )
        .eq("profesor_id", profile.id)

      const normalizadas: Fila[] = ((data as unknown as FilaCruda[]) ?? [])
        .filter((f) => f.class_occurrences)
        .map((f) => {
          const serie = Array.isArray(f.class_occurrences?.class_series)
            ? f.class_occurrences?.class_series[0]
            : f.class_occurrences?.class_series
          return {
            fecha: f.class_occurrences!.fecha,
            hora: f.class_occurrences!.hora,
            estadoOcurrencia: f.class_occurrences!.estado,
            titulo: serie?.titulo ?? "Clase",
            lugar: serie?.lugar ?? null,
            nivel: serie?.nivel ?? null,
            alumnoIds: f.class_occurrences!.alumno_ids,
            valorGenerado: f.valor_generado,
            metodoRegistro: f.metodo_registro,
          }
        })
        .sort((a, b) => (b.fecha + b.hora).localeCompare(a.fecha + a.hora))

      setAlumnosPrivados(await cargarAlumnosConPlanPrivado(normalizadas.flatMap((f) => f.alumnoIds)))
      setFilas(normalizadas)
      setCargando(false)
    }

    cargar()
  }, [profile?.id])

  const hoy = fechaHoy()
  const visibles = filas.filter((f) => {
    if (pestana === "canceladas") return f.estadoOcurrencia === "cancelada"
    if (pestana === "realizadas") return f.valorGenerado != null
    return f.estadoOcurrencia === "programada" && f.fecha >= hoy
  })

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-text">Mis clases</h1>

      <div className="flex gap-1 self-start rounded-control border border-white/10 bg-surface p-1">
        {PESTANAS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPestana(p.value)}
            className={cn(
              "rounded-control px-4 py-1.5 text-sm font-medium transition-colors",
              pestana === p.value ? "bg-brand text-white" : "text-text-muted hover:text-text",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {cargando ? (
        <p className="text-sm text-text-muted">Cargando...</p>
      ) : visibles.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-center text-sm text-text-muted">
            No hay clases en esta categoría.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visibles.map((f, i) => {
            const etiqueta = etiquetaClase(f.nivel, esOcurrenciaPrivada(f.alumnoIds, alumnosPrivados))
            return (
            <Card key={i}>
              <CardContent className="flex flex-col gap-2 py-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-light">
                    {formatearFecha(f.fecha)}
                  </p>
                  <p className="text-xs text-text-muted">{f.hora.slice(0, 5)}</p>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate font-medium text-text">{f.titulo}</p>
                  {etiqueta && (
                    <Badge variant={etiqueta.variant} className="shrink-0">
                      {etiqueta.texto}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-xs text-text-muted">{f.lugar ?? ""}</p>
                  {pestana === "realizadas" && f.valorGenerado != null && (
                    <Badge variant="success" className="shrink-0">
                      {formatearMoneda(f.valorGenerado)}
                    </Badge>
                  )}
                  {pestana === "canceladas" && (
                    <Badge
                      variant={f.metodoRegistro === "cancelacion_pagada" ? "success" : "muted"}
                      className="shrink-0"
                    >
                      {f.metodoRegistro === "cancelacion_pagada" ? "Pagada" : "Sin pago"}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
