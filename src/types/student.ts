export type TipoAlumno = "academia" | "privada" | "ambas"
export type NivelAlumno = "Básica" | "Intermedia" | "Avanzada"

export interface Student {
  id: string
  nombre: string
  documento: string
  contacto: string | null
  foto: string | null
  tipo: TipoAlumno
  nivel: NivelAlumno
  academia_id: string | null
  tema_carnet: string | null
  tema_carnet_actualizado_en: string | null
  acepto_terminos: boolean
  fecha_acepto_terminos: string | null
}

export interface StudentInput {
  nombre: string
  documento: string
  contacto: string
  foto: string | null
  tipo: TipoAlumno
  nivel: NivelAlumno
  academia_id: string | null
}
