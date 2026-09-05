import { fechaHoy } from "@/lib/attendance"
import { supabase } from "@/lib/supabase"
import type { ClassSeries } from "@/types/classSeries"

const SEMANAS_HORIZONTE = 8

function sumarDias(fechaISO: string, dias: number) {
  const fecha = new Date(`${fechaISO}T00:00:00`)
  fecha.setDate(fecha.getDate() + dias)
  return fecha.toISOString().slice(0, 10)
}

function generarFechas(desde: string, hasta: string, diaSemana: number) {
  const fechas: string[] = []
  const cursor = new Date(`${desde}T00:00:00`)
  const fin = new Date(`${hasta}T00:00:00`)

  while (cursor.getDay() !== diaSemana) {
    cursor.setDate(cursor.getDate() + 1)
  }

  while (cursor <= fin) {
    fechas.push(cursor.toISOString().slice(0, 10))
    cursor.setDate(cursor.getDate() + 7)
  }

  return fechas
}

/**
 * Genera las ocurrencias (filas fechadas) que falten para una serie, desde
 * hoy (o vigente_desde si es futuro) hasta un horizonte de 8 semanas o
 * vigente_hasta, lo que sea antes. Nunca toca ocurrencias ya creadas
 * (respeta canceladas y matrícula existente). Se puede volver a llamar
 * para extender el horizonte más adelante.
 */
export async function generarOcurrencias(serie: ClassSeries) {
  const hoy = fechaHoy()
  const horizonte = sumarDias(hoy, SEMANAS_HORIZONTE * 7)
  const desde = serie.vigente_desde > hoy ? serie.vigente_desde : hoy
  const hasta =
    serie.vigente_hasta && serie.vigente_hasta < horizonte
      ? serie.vigente_hasta
      : horizonte

  if (desde > hasta) return 0

  const fechas = generarFechas(desde, hasta, serie.dia_semana)
  if (fechas.length === 0) return 0

  const { data: existentes } = await supabase
    .from("class_occurrences")
    .select("fecha")
    .eq("serie_id", serie.id)
    .in("fecha", fechas)

  const fechasExistentes = new Set((existentes ?? []).map((e) => e.fecha))
  const fechasNuevas = fechas.filter((f) => !fechasExistentes.has(f))
  if (fechasNuevas.length === 0) return 0

  const filas = fechasNuevas.map((fecha) => ({
    serie_id: serie.id,
    academia_id: serie.academia_id,
    fecha,
    hora: serie.hora,
    estado: "programada" as const,
    alumno_ids: [],
  }))

  const { error } = await supabase.from("class_occurrences").insert(filas)
  if (error) throw error

  return fechasNuevas.length
}
