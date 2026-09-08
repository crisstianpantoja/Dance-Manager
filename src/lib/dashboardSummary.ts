import { supabase } from "@/lib/supabase"

export interface DashboardKpis {
  ingresos: number
  ingresos_prev: number
  gastos: number
  gastos_prev: number
  alumnos_totales: number
  alumnos_nuevos: number
  pagos_pendientes_monto: number
  pagos_pendientes_alumnos: number
}

export type TipoAlertaDashboard =
  | "pagos_pendientes"
  | "sin_renovar"
  | "planes_por_vencer"
  | "alumnos_inactivos"
  | "profesor_pendiente"
  | "contratos_sin_pagar"

export interface AlertaDashboard {
  tipo: TipoAlertaDashboard
  conteo: number | null
  monto: number | null
  nombre: string | null
  fecha: string | null
}

export async function cargarDashboardKpis(
  academiaId: string | null,
  desde: string,
  hasta: string,
): Promise<DashboardKpis | null> {
  const { data, error } = await supabase.rpc("dashboard_kpis", {
    p_academia_id: academiaId,
    p_desde: desde,
    p_hasta: hasta,
  })
  if (error) throw error
  return (data as DashboardKpis[])[0] ?? null
}

export async function cargarDashboardAlertas(academiaId: string | null): Promise<AlertaDashboard[]> {
  const { data, error } = await supabase.rpc("dashboard_alertas", { p_academia_id: academiaId })
  if (error) throw error
  return (data as AlertaDashboard[]) ?? []
}
