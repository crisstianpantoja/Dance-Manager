import { supabase } from "@/lib/supabase"

export interface AppSettings {
  nombre_app: string
  logo_url: string | null
}

export const AJUSTES_POR_DEFECTO: AppSettings = { nombre_app: "Dance Manager", logo_url: null }

export async function obtenerAjustes(organizationId: string): Promise<AppSettings> {
  const { data } = await supabase
    .from("app_settings")
    .select("nombre_app, logo_url")
    .eq("organization_id", organizationId)
    .maybeSingle()

  return (data as AppSettings) ?? AJUSTES_POR_DEFECTO
}

export async function actualizarAjustes(organizationId: string, cambios: Partial<AppSettings>) {
  const { error } = await supabase
    .from("app_settings")
    .update(cambios)
    .eq("organization_id", organizationId)
  if (error) throw error
}
