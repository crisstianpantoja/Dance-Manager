export interface AcademiaResumen {
  id: string
  nombre: string
  codigo: string
  activo: boolean
  created_at: string
  alumnos: number
  profesores: number
  admins: number
}

export interface TotalesPlataforma {
  academias: number
  alumnos: number
  profesores: number
  altas_30_dias: number
}

export interface ResumenPlataforma {
  academias: AcademiaResumen[]
  totales: TotalesPlataforma
}
