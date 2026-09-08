/**
 * Un elemento del calendario del alumno (módulo "Clases"): una clase o
 * un evento, normalizados a la misma forma para poder mostrarlos juntos
 * en la misma grilla mensual/semanal.
 */
export interface AgendaItem {
  id: string
  tipo: "clase" | "evento"
  fecha: string
  hora: string
  titulo: string
  profesor: string | null
  lugar: string | null
  estado: "programada" | "cancelada" | null
  cupoMaximo: number | null
  inscritos: number
  inscrito: boolean
}
