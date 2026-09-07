export type EstadoLiquidacion = "pendiente" | "aprobada" | "pagada" | "anulada"

export interface TeacherLiquidation {
  id: string
  teacher_id: string
  year: number
  month: number
  total_amount: number
  estado: EstadoLiquidacion
  approved_at: string | null
  paid_at: string | null
  payment_method: string | null
  proof_url: string | null
  notes: string | null
  created_at: string
}
