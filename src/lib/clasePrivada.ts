import { supabase } from "@/lib/supabase"

/** Dado un conjunto de alumno_ids (de una o varias ocurrencias visibles en
 * un calendario), devuelve el subconjunto que tiene un plan pagado de
 * modalidad "paquete_privado". Usa un RPC en vez de leer payments
 * directamente porque el profesor no tiene acceso a esa tabla. */
export async function cargarAlumnosConPlanPrivado(alumnoIds: string[]): Promise<Set<string>> {
  const idsUnicos = [...new Set(alumnoIds)]
  if (idsUnicos.length === 0) return new Set()

  const { data, error } = await supabase.rpc("alumnos_con_plan_privado", {
    p_alumno_ids: idsUnicos,
  })
  if (error) throw error

  return new Set((data ?? []).map((fila: { alumno_id: string }) => fila.alumno_id))
}

export function esOcurrenciaPrivada(alumnoIds: string[], alumnosPrivados: Set<string>): boolean {
  return alumnoIds.some((id) => alumnosPrivados.has(id))
}
