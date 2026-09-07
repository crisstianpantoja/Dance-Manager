import { supabase } from "@/lib/supabase"
import type { TeacherAcademy } from "@/types/teacherAcademy"

export async function listarSedesProfesor(teacherId: string) {
  const { data, error } = await supabase
    .from("teacher_academies")
    .select("*")
    .eq("teacher_id", teacherId)

  if (error) throw error
  return (data as TeacherAcademy[]) ?? []
}

/** Reemplaza el conjunto completo de sedes de un profesor. */
export async function guardarSedesProfesor(
  teacherId: string,
  sedes: { academia_id: string; is_primary: boolean }[],
) {
  const { error: errorBorrar } = await supabase
    .from("teacher_academies")
    .delete()
    .eq("teacher_id", teacherId)
  if (errorBorrar) throw errorBorrar

  if (sedes.length === 0) return

  const { error: errorInsertar } = await supabase.from("teacher_academies").insert(
    sedes.map((s) => ({ teacher_id: teacherId, academia_id: s.academia_id, is_primary: s.is_primary })),
  )
  if (errorInsertar) throw errorInsertar
}
