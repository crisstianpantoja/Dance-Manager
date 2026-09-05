import { supabase } from "@/lib/supabase"

async function invocar(funcion: string, body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke(funcion, { body })
  if (error) throw new Error(error.message)
  if (data?.error) throw new Error(data.error)
  return data
}

export async function reportarPago(
  planId: string,
  comprobanteUrl: string,
  metodo: string,
) {
  return invocar("report-payment", { plan_id: planId, comprobante_url: comprobanteUrl, metodo })
}

export type AccionReserva =
  | "reservar_clase"
  | "cancelar_clase"
  | "reservar_evento"
  | "cancelar_evento"

export async function gestionarReserva(accion: AccionReserva, id: string) {
  return invocar("reservations", { accion, id })
}

export async function aceptarTerminos(alumnoId: string) {
  const { error } = await supabase
    .from("students")
    .update({ acepto_terminos: true, fecha_acepto_terminos: new Date().toISOString() })
    .eq("id", alumnoId)

  if (error) throw error
}
