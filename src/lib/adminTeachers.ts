import { supabase } from "@/lib/supabase"
import type { TeacherInput } from "@/types/teacher"

async function invocarFuncion(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("admin-teachers", { body })

  if (error) throw new Error(error.message)
  if (data?.error) throw new Error(data.error)

  return data
}

export async function crearProfesor(datos: TeacherInput) {
  return invocarFuncion({ action: "create", ...datos })
}

export async function eliminarProfesor(id: string) {
  return invocarFuncion({ action: "delete", id })
}
