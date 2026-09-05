export interface EventoDM {
  id: string
  titulo: string
  fecha: string
  hora: string
  lugar: string | null
  descripcion: string | null
  cupo_maximo: number | null
  reservas: string[]
}
