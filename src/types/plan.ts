export type ModalidadPlan = "ilimitada" | "cupos" | "paquete_privado" | "clase_suelta"

export const MODALIDADES: { value: ModalidadPlan; label: string }[] = [
  { value: "ilimitada", label: "Ilimitada" },
  { value: "cupos", label: "Cupos" },
  { value: "paquete_privado", label: "Paquete privado" },
  { value: "clase_suelta", label: "Clase suelta" },
]

export interface Plan {
  id: string
  nombre: string
  modalidad: ModalidadPlan
  clases_incluidas: number | null
  dias_vigencia: number | null
  precio: number
  activo: boolean
}
