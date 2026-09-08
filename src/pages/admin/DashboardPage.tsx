import { PartyPopper } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"

import { AcademyHealth } from "@/components/admin/AcademyHealth"
import { AdminAssistantWidget } from "@/components/admin/AdminAssistantWidget"
import { ClassCard, type ClaseHoyCompleta, type EstadoClaseHoy } from "@/components/admin/ClassCard"
import { ClassesPerformance } from "@/components/admin/ClassesPerformance"
import { DashboardAlerts } from "@/components/admin/DashboardAlerts"
import { DashboardSkeleton } from "@/components/admin/DashboardSkeleton"
import { FinancialChart } from "@/components/admin/FinancialChart"
import { MetricCard } from "@/components/admin/MetricCard"
import { RetentionOverview } from "@/components/admin/RetentionOverview"
import { StudentsOverview } from "@/components/admin/StudentsOverview"
import { TeacherFinanceOverview } from "@/components/admin/TeacherFinanceOverview"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { fechaHoy } from "@/lib/attendance"
import { PERIODOS, rangoDePeriodo, type Periodo } from "@/lib/dashboardPeriod"
import {
  cargarDashboardAlertas,
  cargarDashboardKpis,
  cargarEvolucionAlumnos,
  cargarFinanzasProfesoresResumen,
  cargarRendimientoClases,
  cargarSaludAcademia,
  cargarTendenciaFinanciera,
} from "@/lib/dashboardSummary"
import type {
  AlertaDashboard,
  DashboardKpis,
  FinanzasProfesorResumen,
  PuntoEvolucionAlumnos,
  PuntoTendenciaFinanciera,
  RendimientoClase,
  SaludAcademia,
} from "@/lib/dashboardSummary"
import { formatearFecha, formatearMoneda } from "@/lib/format"
import { supabase } from "@/lib/supabase"
import type { Academy } from "@/types/academy"
import type { EventoDM } from "@/types/event"

const TODAS_LAS_SEDES = "todas"
const SIN_SEDE = "sin-sede"
const SENTINEL_SIN_SEDE = "00000000-0000-0000-0000-000000000000"

function academiaIdParaRpc(filtroSede: string): string | null {
  if (filtroSede === TODAS_LAS_SEDES) return null
  if (filtroSede === SIN_SEDE) return SENTINEL_SIN_SEDE
  return filtroSede
}

function sumarMinutos(hora: string, minutos: number): string {
  const [h, m] = hora.slice(0, 5).split(":").map(Number)
  const total = h * 60 + m + minutos
  const hh = Math.floor((total % (24 * 60)) / 60)
  const mm = total % 60
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`
}

function estadoDeClase(
  estadoOcurrencia: "programada" | "cancelada",
  horaInicio: string,
  horaFin: string,
): EstadoClaseHoy {
  if (estadoOcurrencia === "cancelada") return "cancelada"
  const ahora = new Date().toTimeString().slice(0, 5)
  if (ahora < horaInicio.slice(0, 5)) return "proxima"
  if (ahora < horaFin) return "en_curso"
  return "finalizada"
}

interface FilaOcurrenciaHoy {
  id: string
  hora: string
  estado: "programada" | "cancelada"
  alumno_ids: string[]
  class_series: {
    titulo: string
    nivel: string | null
    duracion_min: number
    lugar: string | null
    cupo_maximo: number | null
    academia_id: string | null
    profesor_ids: string[]
  } | null
}

export function DashboardPage() {
  const [cargando, setCargando] = useState(true)
  const [academias, setAcademias] = useState<Academy[]>([])
  const [filtroSede, setFiltroSede] = useState<string>(TODAS_LAS_SEDES)
  const [periodo, setPeriodo] = useState<Periodo>("mes")

  const [kpis, setKpis] = useState<DashboardKpis | null>(null)
  const [alertas, setAlertas] = useState<AlertaDashboard[]>([])
  const [clasesHoy, setClasesHoy] = useState<ClaseHoyCompleta[]>([])
  const [proximosEventos, setProximosEventos] = useState<EventoDM[]>([])
  const [salud, setSalud] = useState<SaludAcademia | null>(null)
  const [tendenciaFinanciera, setTendenciaFinanciera] = useState<PuntoTendenciaFinanciera[]>([])
  const [evolucionAlumnos, setEvolucionAlumnos] = useState<PuntoEvolucionAlumnos[]>([])
  const [rendimientoClases, setRendimientoClases] = useState<RendimientoClase[]>([])
  const [finanzasProfesores, setFinanzasProfesores] = useState<FinanzasProfesorResumen[]>([])

  useEffect(() => {
    async function cargar() {
      setCargando(true)
      const hoy = fechaHoy()
      const { desde, hasta } = rangoDePeriodo(periodo)
      const academiaIdRpc = academiaIdParaRpc(filtroSede)

      const ahora = new Date()

      const [
        { data: academiasData },
        kpisData,
        alertasData,
        saludData,
        tendenciaData,
        evolucionData,
        rendimientoData,
        finanzasData,
        { data: teachersData },
        { data: ocurrenciasHoy },
        { data: eventos },
      ] = await Promise.all([
        supabase.from("academies").select("*").order("nombre"),
        cargarDashboardKpis(academiaIdRpc, desde, hasta),
        cargarDashboardAlertas(academiaIdRpc),
        cargarSaludAcademia(academiaIdRpc, desde, hasta),
        cargarTendenciaFinanciera(academiaIdRpc, 6),
        cargarEvolucionAlumnos(academiaIdRpc, 6),
        cargarRendimientoClases(academiaIdRpc, desde, hasta),
        cargarFinanzasProfesoresResumen(academiaIdRpc, ahora.getFullYear(), ahora.getMonth() + 1),
        supabase.from("teachers").select("id, nombre"),
        supabase
          .from("class_occurrences")
          .select(
            "id, hora, estado, alumno_ids, class_series(titulo, nivel, duracion_min, lugar, cupo_maximo, academia_id, profesor_ids)",
          )
          .eq("fecha", hoy)
          .order("hora"),
        supabase
          .from("events")
          .select("*")
          .gte("fecha", hoy)
          .order("fecha")
          .order("hora")
          .limit(4),
      ])

      const listaAcademias = (academiasData as Academy[]) ?? []
      setAcademias(listaAcademias)
      setKpis(kpisData)
      setAlertas(alertasData)
      setSalud(saludData)
      setTendenciaFinanciera(tendenciaData)
      setEvolucionAlumnos(evolucionData)
      setRendimientoClases(rendimientoData)
      setFinanzasProfesores(finanzasData)
      setProximosEventos((eventos as EventoDM[]) ?? [])

      const academiasPorId = new Map(listaAcademias.map((a) => [a.id, a.nombre]))
      const profesoresPorId = new Map((teachersData ?? []).map((t) => [t.id as string, t.nombre as string]))

      const filas = (ocurrenciasHoy as unknown as FilaOcurrenciaHoy[] | null) ?? []
      const idsOcurrencias = filas.map((f) => f.id)
      const { data: asistenciasData } =
        idsOcurrencias.length > 0
          ? await supabase
              .from("attendance_records")
              .select("clase_id")
              .in("clase_id", idsOcurrencias)
              .eq("anulado", false)
          : { data: [] as { clase_id: string | null }[] }

      const asistenciasPorOcurrencia = new Map<string, number>()
      for (const a of asistenciasData ?? []) {
        if (!a.clase_id) continue
        asistenciasPorOcurrencia.set(a.clase_id, (asistenciasPorOcurrencia.get(a.clase_id) ?? 0) + 1)
      }

      const clasesCompletas: ClaseHoyCompleta[] = filas
        .filter((f) => {
          const academiaId = f.class_series?.academia_id ?? null
          if (filtroSede === TODAS_LAS_SEDES) return true
          if (filtroSede === SIN_SEDE) return !academiaId
          return academiaId === filtroSede
        })
        .map((f) => {
          const horaInicio = f.hora.slice(0, 5)
          const horaFin = sumarMinutos(f.hora, f.class_series?.duracion_min ?? 60)
          return {
            id: f.id,
            titulo: f.class_series?.titulo ?? "Clase",
            nivel: f.class_series?.nivel ?? null,
            horaInicio,
            horaFin,
            lugar: f.class_series?.lugar ?? null,
            academiaNombre: f.class_series?.academia_id
              ? (academiasPorId.get(f.class_series.academia_id) ?? null)
              : null,
            profesor:
              (f.class_series?.profesor_ids ?? [])
                .map((id) => profesoresPorId.get(id))
                .filter(Boolean)
                .join(", ") || null,
            inscritos: f.alumno_ids.length,
            cupoMaximo: f.class_series?.cupo_maximo ?? null,
            asistencias: asistenciasPorOcurrencia.get(f.id) ?? 0,
            estado: estadoDeClase(f.estado, horaInicio, horaFin),
          }
        })

      setClasesHoy(clasesCompletas)
      setCargando(false)
    }

    cargar()
  }, [filtroSede, periodo])

  const margenPct = useMemo(() => {
    if (!kpis || kpis.ingresos <= 0) return null
    return ((kpis.ingresos - kpis.gastos) / kpis.ingresos) * 100
  }, [kpis])

  const tendencia = (actual: number, previo: number): number | null => {
    if (previo === 0) return null
    return ((actual - previo) / previo) * 100
  }

  const alertaSalud = useMemo(() => {
    const conTasa = rendimientoClases
      .filter((c) => c.inscritos > 0)
      .map((c) => ({ titulo: c.titulo, tasa: Math.round((c.asistencias / c.inscritos) * 100) }))
      .sort((a, b) => a.tasa - b.tasa)
    const peor = conTasa[0]
    if (peor && peor.tasa < 50) {
      return `Atención: la asistencia de ${peor.titulo} está en ${peor.tasa}%.`
    }
    return null
  }, [rendimientoClases])

  if (cargando || !kpis) {
    return <DashboardSkeleton />
  }

  const ganancia = kpis.ingresos - kpis.gastos

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-text">Inicio</h1>
        <div className="flex flex-wrap gap-2">
          <Select value={periodo} onValueChange={(v) => setPeriodo(v as Periodo)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIODOS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {academias.length > 0 && (
            <Select value={filtroSede} onValueChange={setFiltroSede}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TODAS_LAS_SEDES}>Todas las sedes</SelectItem>
                <SelectItem value={SIN_SEDE}>Sin sede</SelectItem>
                {academias.map((academia) => (
                  <SelectItem key={academia.id} value={academia.id}>
                    {academia.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <AdminAssistantWidget />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          titulo="Ingresos"
          valor={formatearMoneda(kpis.ingresos)}
          tendenciaPct={tendencia(kpis.ingresos, kpis.ingresos_prev)}
          bienSiSube
          accentClassName="border-l-success"
          valorClassName="text-success"
        />
        <MetricCard
          titulo="Gastos"
          valor={formatearMoneda(kpis.gastos)}
          tendenciaPct={tendencia(kpis.gastos, kpis.gastos_prev)}
          bienSiSube={false}
          accentClassName="border-l-error"
          valorClassName="text-error"
        />
        <MetricCard
          titulo="Ganancia neta"
          valor={formatearMoneda(ganancia)}
          tendenciaPct={tendencia(ganancia, kpis.ingresos_prev - kpis.gastos_prev)}
          bienSiSube
          nota={margenPct != null ? `Margen: ${margenPct.toFixed(0)}%` : undefined}
          valorClassName={ganancia >= 0 ? "text-success" : "text-error"}
        />
        <MetricCard
          titulo="Alumnos activos"
          valor={String(kpis.alumnos_totales)}
          nota={kpis.alumnos_nuevos > 0 ? `+${kpis.alumnos_nuevos} este periodo` : undefined}
          to="/admin/alumnos"
        />
      </div>

      {kpis.pagos_pendientes_alumnos > 0 && (
        <Link to="/admin/pagos" className="w-fit">
          <Card className="transition-colors hover:bg-surface-hover">
            <CardContent className="flex items-center gap-6 py-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-text-muted">Pagos pendientes</p>
                <p className="font-semibold text-warning">{formatearMoneda(kpis.pagos_pendientes_monto)}</p>
              </div>
              <p className="text-sm text-text-muted">
                {kpis.pagos_pendientes_alumnos} alumno{kpis.pagos_pendientes_alumnos === 1 ? "" : "s"}
              </p>
            </CardContent>
          </Card>
        </Link>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-3 lg:col-span-2">
          <h2 className="font-semibold text-text">Clases de hoy</h2>
          {clasesHoy.length === 0 ? (
            <Card>
              <CardContent className="py-6 text-center text-sm text-text-muted">
                No hay clases programadas para hoy.
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-3">
              {clasesHoy.map((clase) => (
                <ClassCard key={clase.id} clase={clase} />
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <DashboardAlerts alertas={alertas} />
          {salud && <AcademyHealth salud={salud} alertaTexto={alertaSalud} />}
        </div>
      </div>

      {tendenciaFinanciera.length > 0 && <FinancialChart datos={tendenciaFinanciera} />}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <StudentsOverview
          totales={kpis.alumnos_totales}
          nuevos={kpis.alumnos_nuevos}
          planesPorVencer={alertas.find((a) => a.tipo === "planes_por_vencer")?.conteo ?? 0}
          pagosVencidos={alertas.find((a) => a.tipo === "sin_renovar")?.conteo ?? 0}
          evolucion={evolucionAlumnos}
        />
        {salud && <RetentionOverview salud={salud} />}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ClassesPerformance clases={rendimientoClases} />
        <TeacherFinanceOverview finanzas={finanzasProfesores} />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 font-semibold text-text">
          <PartyPopper className="size-5 text-brand-light" />
          Próximos eventos
        </h2>
        {proximosEventos.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-sm text-text-muted">
              No hay eventos próximos.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {proximosEventos.map((e) => (
              <Card key={e.id}>
                <CardContent className="flex flex-col gap-1 py-4">
                  <p className="font-medium text-text">{e.titulo}</p>
                  <p className="text-xs text-text-muted">
                    {formatearFecha(e.fecha)} · {e.hora.slice(0, 5)}
                  </p>
                  <p className="text-xs text-text-muted">
                    {e.cupo_maximo ? `${e.reservas.length}/${e.cupo_maximo} cupos` : `${e.reservas.length} inscritos`}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
