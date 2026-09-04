import { createClient } from "@supabase/supabase-js"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Faltan las variables de entorno VITE_SUPABASE_URL y/o VITE_SUPABASE_ANON_KEY. Revisa tu archivo .env",
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/** Dominio sintético usado para mapear documento -> email de Supabase Auth. */
export const AUTH_EMAIL_DOMAIN = "dance.local"

export function documentoToEmail(documento: string) {
  return `${documento.trim()}@${AUTH_EMAIL_DOMAIN}`
}
