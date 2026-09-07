import { fechaHoy } from "@/lib/attendance"
import { supabase } from "@/lib/supabase"
import type { ClaseProfesorHoy } from "@/types/classOccurrenceTeacher"

export interface ProfesorIdentificado {
  profesor_id: string
  nombre: string
  foto: string | null
  activo: boolean
}

export async function identificarProfesorPorQr(token: string) {
  const { data, error } = await supabase.rpc("identificar_profesor_por_qr", { p_token: token })
  if (error) throw error
  const filas = (data as ProfesorIdentificado[]) ?? []
  return filas[0] ?? null
}

export async function registrarAsistenciaProfesor(
  occurrenceId: string,
  profesorId: string,
  valorOverride?: number,
) {
  const { data, error } = await supabase.rpc("registrar_asistencia_profesor", {
    p_occurrence_id: occurrenceId,
    p_profesor_id: profesorId,
    p_valor_override: valorOverride ?? null,
  })
  if (error) throw error
  return (data as { valor_generado: number }[])[0]?.valor_generado ?? null
}

export async function confirmarAsistenciaManual(
  occurrenceId: string,
  profesorId: string,
  valorOverride?: number,
  nota?: string,
) {
  const { data, error } = await supabase.rpc("confirmar_asistencia_manual", {
    p_occurrence_id: occurrenceId,
    p_profesor_id: profesorId,
    p_valor_override: valorOverride ?? null,
    p_nota: nota ?? null,
  })
  if (error) throw error
  return (data as { valor_generado: number }[])[0]?.valor_generado ?? null
}

export async function marcarAusenteProfesor(occurrenceId: string, profesorId: string, nota?: string) {
  const { error } = await supabase.rpc("marcar_ausente_profesor", {
    p_occurrence_id: occurrenceId,
    p_profesor_id: profesorId,
    p_nota: nota ?? null,
  })
  if (error) throw error
}

export async function confirmarPagoCanceladaExcepcional(
  occurrenceId: string,
  profesorId: string,
  valorOverride?: number,
  nota?: string,
) {
  const { data, error } = await supabase.rpc("confirmar_pago_cancelada_excepcional", {
    p_occurrence_id: occurrenceId,
    p_profesor_id: profesorId,
    p_valor_override: valorOverride ?? null,
    p_nota: nota ?? null,
  })
  if (error) throw error
  return (data as { valor_generado: number }[])[0]?.valor_generado ?? null
}

export async function revertirAsistenciaProfesor(occurrenceId: string, profesorId: string) {
  const { error } = await supabase.rpc("revertir_asistencia_profesor", {
    p_occurrence_id: occurrenceId,
    p_profesor_id: profesorId,
  })
  if (error) throw error
}

interface FilaOcurrenciaProfesor {
  id: string
  occurrence_id: string
  valor_previsto: number | null
  class_occurrences: {
    fecha: string
    hora: string
    estado: string
    class_series: { titulo: string; lugar: string | null } | { titulo: string; lugar: string | null }[] | null
  } | null
}

function normalizarSerie(
  serie: FilaOcurrenciaProfesor["class_occurrences"] extends null
    ? never
    : NonNullable<FilaOcurrenciaProfesor["class_occurrences"]>["class_series"],
) {
  return Array.isArray(serie) ? (serie[0] ?? null) : serie
}

/** Clases de HOY de un profesor, sin resolver, ordenadas por cercanía a la hora actual. */
export async function cargarClasesProfesorHoy(profesorId: string): Promise<ClaseProfesorHoy[]> {
  const hoy = fechaHoy()

  const { data, error } = await supabase
    .from("class_occurrence_teachers")
    .select("id, occurrence_id, valor_previsto, class_occurrences(fecha, hora, estado, class_series(titulo, lugar))")
    .eq("profesor_id", profesorId)
    .eq("estado_asistencia", "programada")

  if (error) throw error

  const filas = (data as unknown as FilaOcurrenciaProfesor[]) ?? []
  const horaActual = new Date().toTimeString().slice(0, 5)

  return filas
    .filter((f) => f.class_occurrences?.fecha === hoy && f.class_occurrences?.estado !== "cancelada")
    .map((f) => {
      const serie = normalizarSerie(f.class_occurrences?.class_series ?? null)
      return {
        occurrenceTeacherId: f.id,
        occurrenceId: f.occurrence_id,
        fecha: f.class_occurrences!.fecha,
        hora: f.class_occurrences!.hora,
        titulo: serie?.titulo ?? "Clase",
        lugar: serie?.lugar ?? null,
        valorPrevisto: f.valor_previsto,
        estadoOcurrencia: f.class_occurrences!.estado,
      }
    })
    .sort(
      (a, b) =>
        Math.abs(a.hora.localeCompare(horaActual)) - Math.abs(b.hora.localeCompare(horaActual)),
    )
}

export interface PendienteValidar extends ClaseProfesorHoy {
  profesorId: string
  profesorNombre: string
}

interface FilaPendiente extends FilaOcurrenciaProfesor {
  profesor_id: string
  teachers: { nombre: string } | { nombre: string }[] | null
}

/** Clases ya pasadas donde ningún profesor asignado tiene asistencia resuelta. */
export async function cargarPendientesDeValidar(): Promise<PendienteValidar[]> {
  const hoy = fechaHoy()

  const { data, error } = await supabase
    .from("class_occurrence_teachers")
    .select(
      "id, occurrence_id, profesor_id, valor_previsto, teachers(nombre), class_occurrences(fecha, hora, estado, class_series(titulo, lugar))",
    )
    .eq("estado_asistencia", "programada")

  if (error) throw error

  const filas = (data as unknown as FilaPendiente[]) ?? []

  return filas
    .filter((f) => f.class_occurrences?.fecha && f.class_occurrences.fecha < hoy && f.class_occurrences.estado !== "cancelada")
    .map((f) => {
      const serie = normalizarSerie(f.class_occurrences?.class_series ?? null)
      const profesor = Array.isArray(f.teachers) ? (f.teachers[0] ?? null) : f.teachers
      return {
        occurrenceTeacherId: f.id,
        occurrenceId: f.occurrence_id,
        profesorId: f.profesor_id,
        profesorNombre: profesor?.nombre ?? "Profesor",
        fecha: f.class_occurrences!.fecha,
        hora: f.class_occurrences!.hora,
        titulo: serie?.titulo ?? "Clase",
        lugar: serie?.lugar ?? null,
        valorPrevisto: f.valor_previsto,
        estadoOcurrencia: f.class_occurrences!.estado,
      }
    })
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
}
