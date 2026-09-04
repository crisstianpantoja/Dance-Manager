import type { ModalidadPlan } from "@/types/plan"

export type EstadoPago = "pendiente" | "pagado" | "rechazado"

export interface Payment {
  id: string
  alumno_id: string
  plan_id: string | null
  modalidad: ModalidadPlan
  concepto: string
  clases_incluidas: number
  clases_usadas: number
  fecha: string
  fecha_vencimiento: string | null
  monto: number
  estado: EstadoPago
  comprobante_url: string | null
  metodo: string | null
}
