export type Rol = "admin" | "profesor" | "alumno"

export interface Profile {
  id: string
  documento: string
  nombre: string
  rol: Rol
  organization_id: string
}
