export interface Teacher {
  id: string
  nombre: string
  documento: string
  contacto: string | null
  rol_interno: string | null
  foto: string | null
  activo: boolean
}

export interface TeacherInput {
  nombre: string
  documento: string
  contacto: string
  rol_interno: string
  foto: string | null
}
