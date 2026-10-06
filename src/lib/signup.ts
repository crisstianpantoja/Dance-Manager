import { supabase } from "@/lib/supabase"

export interface DatosRegistroAcademia {
  nombreAcademia: string
  codigoAcademia: string
  adminNombre: string
  adminDocumento: string
  adminPassword: string
}

export async function registrarAcademia(datos: DatosRegistroAcademia) {
  const { data, error } = await supabase.functions.invoke("signup-academy", {
    body: {
      nombre_academia: datos.nombreAcademia,
      codigo_academia: datos.codigoAcademia,
      admin_nombre: datos.adminNombre,
      admin_documento: datos.adminDocumento,
      admin_password: datos.adminPassword,
    },
  })

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

  return data as { organization_id: string; codigo: string }
}
