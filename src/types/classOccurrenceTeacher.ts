export type EstadoAsistenciaProfesor = "programada" | "presente" | "ausente"
export type MetodoRegistroProfesor = "qr" | "manual" | "cancelacion_pagada"

export interface ClassOccurrenceTeacher {
  id: string
  occurrence_id: string
  profesor_id: string
  estado_asistencia: EstadoAsistenciaProfesor
  valor_previsto: number | null
  valor_generado: number | null
  genera_pago: boolean | null
  registrado_en: string | null
  registrado_por: string | null
  metodo_registro: MetodoRegistroProfesor | null
  nota_registro: string | null
  valor_congelado_en: string | null
}

export interface ClaseProfesorHoy {
  occurrenceTeacherId: string
  occurrenceId: string
  fecha: string
  hora: string
  titulo: string
  lugar: string | null
  valorPrevisto: number | null
  estadoOcurrencia: string
}
