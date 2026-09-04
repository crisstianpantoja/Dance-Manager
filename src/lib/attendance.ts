import { supabase } from "@/lib/supabase"
import type {
  ClaseTipo,
  EstadoPlanAttendance,
  OcurrenciaHoy,
  OrigenAsistencia,
} from "@/types/attendance"

interface ClaseInfo {
  clase_tipo: ClaseTipo
  clase_id?: string | null
  titulo: string
  categoria?: string | null
  fecha: string
  hora: string
  academia_id?: string | null
}

async function invocarFuncion(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("attendance", { body })

  if (error) throw new Error(error.message)
  if (data?.error) throw new Error(data.error)

  return data
}

export async function registrarAsistencia(
  alumnoId: string,
  clase: ClaseInfo,
  origen: OrigenAsistencia,
): Promise<{ estado_plan: EstadoPlanAttendance }> {
  return invocarFuncion({ action: "register", alumno_id: alumnoId, clase, origen })
}

export async function anularAsistencia(attendanceId: string) {
  return invocarFuncion({ action: "anular", attendance_id: attendanceId })
}

function horaAhora() {
  return new Date().toTimeString().slice(0, 5)
}

function fechaHoy() {
  return new Date().toISOString().slice(0, 10)
}

export { fechaHoy, horaAhora }

export async function cargarOcurrenciasDeHoy(): Promise<OcurrenciaHoy[]> {
  const hoy = fechaHoy()

  const { data, error } = await supabase
    .from("class_occurrences")
    .select("id, fecha, hora, academia_id, class_series(titulo, categoria)")
    .eq("fecha", hoy)
    .eq("estado", "programada")

  if (error || !data) return []

  return data.map((fila) => {
    const serie = Array.isArray(fila.class_series) ? fila.class_series[0] : fila.class_series
    return {
      id: fila.id,
      fecha: fila.fecha,
      hora: fila.hora,
      academia_id: fila.academia_id,
      titulo: serie?.titulo ?? "Clase",
      categoria: serie?.categoria ?? null,
    }
  })
}
