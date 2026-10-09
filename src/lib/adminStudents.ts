import { supabase } from "@/lib/supabase"
import type { StudentInput } from "@/types/student"

export interface PersonaExistente {
  id: string
  nombre: string
  rol: "admin" | "profesor" | "alumno"
}

export type ResultadoCrearAlumno =
  | { attach_candidate: PersonaExistente }
  | { id: string; attached?: boolean }

async function invocarFuncion(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("admin-students", { body })

  if (error) {
    const contexto = (error as { context?: Response }).context
    if (contexto) {
      try {
        const cuerpo = await contexto.clone().json()
        if (cuerpo?.error) throw new Error(cuerpo.error)
      } catch {
        // si no se pudo leer el cuerpo, se usa el mensaje genérico de abajo
      }
    }
    throw new Error(error.message)
  }
  if (data?.error) throw new Error(data.error)

  return data
}

export async function crearAlumno(
  datos: StudentInput,
  confirmarAdjuntar?: boolean,
): Promise<ResultadoCrearAlumno> {
  return invocarFuncion({ action: "create", ...datos, confirm_attach: confirmarAdjuntar })
}

export async function eliminarAlumno(id: string) {
  return invocarFuncion({ action: "delete", id })
}
