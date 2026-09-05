export const DIAS_SEMANA = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
] as const

export interface ClassSeries {
  id: string
  academia_id: string | null
  titulo: string
  categoria: string | null
  dia_semana: number
  hora: string
  duracion_min: number
  profesor_ids: string[]
  cupo_maximo: number | null
  lugar: string | null
  vigente_desde: string
  vigente_hasta: string | null
}

export type EstadoOcurrencia = "programada" | "cancelada"

export interface ClassOccurrence {
  id: string
  serie_id: string
  academia_id: string | null
  fecha: string
  hora: string
  alumno_ids: string[]
  estado: EstadoOcurrencia
}

export interface OcurrenciaConSerie extends ClassOccurrence {
  titulo: string
  categoria: string | null
  cupo_maximo: number | null
  lugar: string | null
}
