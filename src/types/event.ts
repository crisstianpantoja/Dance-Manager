export interface EventoDM {
  id: string
  titulo: string
  fecha: string
  hora: string
  lugar: string | null
  descripcion: string | null
  cupo_maximo: number | null
  reservas: string[]
  imagen_url: string | null
  precio: number | null
  profesores: string | null
}
