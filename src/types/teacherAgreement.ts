export interface TeacherAgreement {
  id: string
  teacher_id: string
  amount_per_class: number
  effective_from: string
  effective_to: string | null
  notes: string | null
  created_at: string
}
