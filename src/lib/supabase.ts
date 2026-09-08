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

/**
 * Código de la primera organización (el negocio original, antes de que
 * existieran organizaciones). Sus usuarios ya existen en Supabase Auth
 * con el email "documento@dance.local" (sin prefijo): mantenemos ese
 * esquema para no tener que migrar ninguna cuenta existente. Toda
 * organización nueva sí usa el prefijo "documento@<codigo>.dance.local",
 * lo que evita choques cuando dos academias tienen alumnos/profesores
 * con el mismo número de documento.
 */
export const CODIGO_ACADEMIA_PRINCIPAL = "principal"

export function documentoToEmail(documento: string, codigoAcademia: string) {
  const doc = documento.trim()
  const codigo = codigoAcademia.trim().toLowerCase()

  if (codigo === CODIGO_ACADEMIA_PRINCIPAL) {
    return `${doc}@${AUTH_EMAIL_DOMAIN}`
  }

  return `${doc}@${codigo}.${AUTH_EMAIL_DOMAIN}`
}
