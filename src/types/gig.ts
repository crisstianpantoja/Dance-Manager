export type GigTipo = "dj" | "tallerista" | "contrato"
export type GigEstado = "cotizado" | "confirmado" | "pagado"

export interface Gig {
  id: string
  tipo: GigTipo
  evento: string
  lugar: string | null
  fecha: string
  hora: string
  duracion_min: number
  pago: number
  estado: GigEstado
  contacto: string | null
  notas: string | null
  acompanado: boolean
  acompanante: string | null
  pago_acompanante: number | null
}
