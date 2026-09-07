import { supabase } from "@/lib/supabase"

export async function obtenerEnlaceWallet(): Promise<string> {
  const { data, error } = await supabase.functions.invoke("wallet-pass", { body: {} })

  if (error) {
    let mensaje = error.message
    const contexto = (error as { context?: Response }).context
    if (contexto && typeof contexto.json === "function") {
      try {
        const cuerpo = await contexto.json()
        if (cuerpo?.error) mensaje = cuerpo.error
      } catch {
        // el cuerpo no era JSON: nos quedamos con el mensaje genérico
      }
    }
    throw new Error(mensaje)
  }

  if (data?.error) throw new Error(data.error)
  if (!data?.saveUrl) throw new Error("No se pudo generar el enlace de Wallet.")
  return data.saveUrl as string
}
