import { supabase } from "@/lib/supabase"
import type { TeacherAgreement } from "@/types/teacherAgreement"

export async function crearAcuerdoProfesor(
  teacherId: string,
  amountPerClass: number,
  effectiveFrom: string,
  notes?: string,
) {
  const { data, error } = await supabase.rpc("crear_acuerdo_profesor", {
    p_teacher_id: teacherId,
    p_amount: amountPerClass,
    p_effective_from: effectiveFrom,
    p_notes: notes ?? null,
  })

  if (error) throw error
  return data as string
}

export async function listarAcuerdosProfesor(teacherId: string) {
  const { data, error } = await supabase
    .from("teacher_payment_agreements")
    .select("*")
    .eq("teacher_id", teacherId)
    .order("effective_from", { ascending: false })

  if (error) throw error
  return (data as TeacherAgreement[]) ?? []
}
