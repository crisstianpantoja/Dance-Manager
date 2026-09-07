import { supabase } from "@/lib/supabase"

export interface ResumenFinancieroProfesor {
  generado: number
  generado_clases: number
  por_dictar: number
  por_dictar_clases: number
  pendiente_validar: number
  pendiente_validar_clases: number
  pagado: number
  pendiente_por_pagar: number
}

export interface DetalleFinancieroFila {
  fecha: string
  titulo: string
  lugar: string | null
  valor: number
  estado: "Generado" | "Pagado" | "Por dictar" | "Pendiente de validar"
}

export async function cargarResumenFinanciero(profesorId: string, anio: number, mes: number) {
  const { data, error } = await supabase.rpc("resumen_financiero_profesor", {
    p_profesor_id: profesorId,
    p_year: anio,
    p_month: mes,
  })
  if (error) throw error
  return (data as ResumenFinancieroProfesor[])[0] ?? null
}

export async function cargarDetalleFinanciero(profesorId: string, anio: number, mes: number) {
  const { data, error } = await supabase.rpc("detalle_financiero_profesor", {
    p_profesor_id: profesorId,
    p_year: anio,
    p_month: mes,
  })
  if (error) throw error
  return (data as DetalleFinancieroFila[]) ?? []
}
