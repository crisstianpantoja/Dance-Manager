export interface StudentEvaluation {
  id: string
  alumno_id: string
  evaluador_id: string | null
  fecha: string
  ritmo: number
  movimiento: number
  imagen: number
  conexion: number
  nota: string | null
}

export interface StudentEvaluationInput {
  alumno_id: string
  ritmo: number
  movimiento: number
  imagen: number
  conexion: number
  nota: string
}
