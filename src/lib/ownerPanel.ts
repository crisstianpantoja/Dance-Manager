import { supabase } from "@/lib/supabase"
import type { ResumenPlataforma } from "@/types/owner"

async function invocarFuncion(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("owner-panel", { body })

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

export async function cargarResumenPlataforma(): Promise<ResumenPlataforma> {
  return invocarFuncion({ action: "list" })
}

export async function alternarActivaAcademia(organizationId: string, activo: boolean) {
  return invocarFuncion({ action: "toggle_active", organization_id: organizationId, activo })
}
