import { supabase } from "@/lib/supabase"

export async function obtenerEnlaceWallet(): Promise<string> {
  const { data, error } = await supabase.functions.invoke("wallet-pass", { body: {} })
  if (error) throw new Error(error.message)
  if (data?.error) throw new Error(data.error)
  if (!data?.saveUrl) throw new Error("No se pudo generar el enlace de Wallet.")
  return data.saveUrl as string
}
