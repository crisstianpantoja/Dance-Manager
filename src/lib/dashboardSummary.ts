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

export interface SaludAcademia {
  score: number
  score_prev: number
  retencion_pct: number
  asistencia_pct: number
  pagos_al_dia_pct: number
  crecimiento_pct: number
  ocupacion_pct: number
  frecuentes: number
  en_riesgo: number
  inactivos: number
}

export async function cargarSaludAcademia(
  academiaId: string | null,
  desde: string,
  hasta: string,
): Promise<SaludAcademia | null> {
  const { data, error } = await supabase.rpc("dashboard_salud", {
    p_academia_id: academiaId,
    p_desde: desde,
    p_hasta: hasta,
  })
  if (error) throw error
  return (data as SaludAcademia[])[0] ?? null
}

export interface PuntoTendenciaFinanciera {
  mes: string
  ingresos: number
  gastos: number
}

export async function cargarTendenciaFinanciera(
  academiaId: string | null,
  meses = 6,
): Promise<PuntoTendenciaFinanciera[]> {
  const { data, error } = await supabase.rpc("dashboard_tendencia_financiera", {
    p_academia_id: academiaId,
    p_meses: meses,
  })
  if (error) throw error
  return (data as PuntoTendenciaFinanciera[]) ?? []
}

export interface PuntoEvolucionAlumnos {
  mes: string
  total: number
}

export async function cargarEvolucionAlumnos(
  academiaId: string | null,
  meses = 6,
): Promise<PuntoEvolucionAlumnos[]> {
  const { data, error } = await supabase.rpc("dashboard_evolucion_alumnos", {
    p_academia_id: academiaId,
    p_meses: meses,
  })
  if (error) throw error
  return (data as PuntoEvolucionAlumnos[]) ?? []
}

export interface RendimientoClase {
  serie_id: string
  titulo: string
  clases_realizadas: number
  asistencias: number
  inscritos: number
  cupo_maximo: number | null
  ocupacion_pct: number | null
}

export async function cargarRendimientoClases(
  academiaId: string | null,
  desde: string,
  hasta: string,
): Promise<RendimientoClase[]> {
  const { data, error } = await supabase.rpc("dashboard_rendimiento_clases", {
    p_academia_id: academiaId,
    p_desde: desde,
    p_hasta: hasta,
  })
  if (error) throw error
  return (data as RendimientoClase[]) ?? []
}

export interface FinanzasProfesorResumen {
  profesor_id: string
  nombre: string
  clases: number
  tarifa_promedio: number
  generado: number
  pagado: number
  pendiente: number
}

export async function cargarFinanzasProfesoresResumen(
  academiaId: string | null,
  anio: number,
  mes: number,
): Promise<FinanzasProfesorResumen[]> {
  const { data, error } = await supabase.rpc("dashboard_finanzas_profesores", {
    p_academia_id: academiaId,
    p_anio: anio,
    p_mes: mes,
  })
  if (error) throw error
  return (data as FinanzasProfesorResumen[]) ?? []
}
