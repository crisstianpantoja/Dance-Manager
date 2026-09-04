export type ClaseTipo = "academia" | "programada" | "sesion" | "evento" | "manual"
export type OrigenAsistencia = "qr" | "manual"
export type EstadoPlanAttendance = "cupo" | "ilimitada" | "sin_cupo" | "vencido" | "sin_plan"

export interface AttendanceRecord {
  id: string
  alumno_id: string
  clase_key: string
  clase_tipo: ClaseTipo
  clase_id: string | null
  fecha: string
  hora: string
  titulo: string
  categoria: string | null
  origen: OrigenAsistencia
  academia_id: string | null
  consumio_cupo: boolean
  estado_plan: EstadoPlanAttendance
  payment_id: string | null
  anulado: boolean
}

export interface OcurrenciaHoy {
  id: string
  fecha: string
  hora: string
  academia_id: string | null
  titulo: string
  categoria: string | null
}

export const ETIQUETA_ESTADO_PLAN: Record<EstadoPlanAttendance, string> = {
  cupo: "Descontó cupo",
  ilimitada: "Plan ilimitado",
  sin_cupo: "Sin cupos disponibles",
  vencido: "Plan vencido",
  sin_plan: "Sin plan activo",
}

export const ES_ESTADO_EXITOSO: Record<EstadoPlanAttendance, boolean> = {
  cupo: true,
  ilimitada: true,
  sin_cupo: false,
  vencido: false,
  sin_plan: false,
}
