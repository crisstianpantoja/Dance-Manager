import { supabase } from "@/lib/supabase"
import type { StudentEvaluation, StudentEvaluationInput } from "@/types/evaluation"

export async function listarEvaluaciones(alumnoId: string): Promise<StudentEvaluation[]> {
  const { data, error } = await supabase
    .from("student_evaluations")
    .select("*")
    .eq("alumno_id", alumnoId)
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false })

  if (error) throw error
  return (data as StudentEvaluation[]) ?? []
}

export async function registrarEvaluacion(input: StudentEvaluationInput) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { error } = await supabase.from("student_evaluations").insert({
    ...input,
    evaluador_id: user?.id ?? null,
  })

  if (error) throw error
}
