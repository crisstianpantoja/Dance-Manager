import { supabase } from "@/lib/supabase"
import type { ClassSeriesTeacher } from "@/types/classSeriesTeacher"

export interface AsignacionProfesor {
  profesor_id: string
  amount_override: number | null
}

export async function guardarProfesoresSerie(
  serieId: string,
  asignaciones: AsignacionProfesor[],
) {
  const { error } = await supabase.rpc("guardar_profesores_serie", {
    p_serie_id: serieId,
    p_asignaciones: asignaciones,
  })

  if (error) throw error
}

export async function listarProfesoresSerie(serieId: string) {
  const { data, error } = await supabase
    .from("class_series_teachers")
    .select("*")
    .eq("serie_id", serieId)

  if (error) throw error
  return (data as ClassSeriesTeacher[]) ?? []
}
