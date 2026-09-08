import { AlertTriangle, Clock, Music, PartyPopper, Users } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { fechaHoy } from "@/lib/attendance"
import { formatearFecha, formatearMoneda } from "@/lib/format"
import { calcularAlumnosSinRenovar } from "@/lib/retention"
import { supabase } from "@/lib/supabase"
import type { Academy } from "@/types/academy"
import type { EventoDM } from "@/types/event"
import type { Gig } from "@/types/gig"

const TODAS_LAS_SEDES = "todas"
const SIN_SEDE = "sin-sede"

interface ClaseHoy {
  id: string
  hora: string
  titulo: string
  lugar: string | null
  academia_id: string | null
}

interface AlumnoRaw {
  id: string
  academia_id: string | null
}

interface MontoConSede {
  monto: number
  academia_id: string | null
}

interface PagoRetencionRaw {
  alumno_id: string
  fecha_vencimiento: string | null
  academia_id: string | null
  nombre: string
  contacto: string | null
}

export function DashboardPage() {
  const [cargando, setCargando] = useState(true)
  const [academias, setAcademias] = useState<Academy[]>([])
  const [filtroSede, setFiltroSede] = useState<string>(TODAS_LAS_SEDES)

  const [alumnos, setAlumnos] = useState<AlumnoRaw[]>([])
  const [pagosMes, setPagosMes] = useState<MontoConSede[]>([])
  const [gigsMes, setGigsMes] = useState<MontoConSede[]>([])
  const [gastos, setGastos] = useState<MontoConSede[]>([])
  const [pagosPendientesRaw, setPagosPendientesRaw] = useState<MontoConSede[]>([])
  const [pagosRetencion, setPagosRetencion] = useState<PagoRetencionRaw[]>([])
  const [clasesHoy, setClasesHoy] = useState<ClaseHoy[]>([])
  const [proximosEventos, setProximosEventos] = useState<EventoDM[]>([])
  const [proximosContratos, setProximosContratos] = useState<Gig[]>([])

  useEffect(() => {
    async function cargar() {
      setCargando(true)
      const hoy = fechaHoy()
      const inicioMes = `${hoy.slice(0, 7)}-01`

      const [
        { data: academiasData },
        { data: alumnosData },
        { data: pagosMesData },
        { data: gigsMesData },
        { data: gastosData },
        { data: pagosPendientesData },
        { data: pagosParaRetencion },
        { data: ocurrenciasHoy },
        { data: eventos },
        { data: contratos },
      ] = await Promise.all([
        supabase.from("academies").select("*").order("nombre"),
        supabase.from("students").select("id, academia_id"),
        supabase
          .from("payments")
          .select("monto, students(academia_id)")
          .eq("estado", "pagado")
          .gte("fecha", inicioMes)
          .lte("fecha", hoy),
        supabase
          .from("gigs")
          .select("pago, academia_id")
          .eq("estado", "pagado")
          .gte("fecha", inicioMes)
          .lte("fecha", hoy),
        supabase.from("expenses").select("monto, academia_id").gte("fecha", inicioMes).lte("fecha", hoy),
        supabase
          .from("payments")
          .select("monto, students(academia_id)")
          .eq("estado", "pendiente"),
        supabase
          .from("payments")
          .select("alumno_id, fecha_vencimiento, students(nombre, contacto, academia_id)")
          .eq("estado", "pagado"),
        supabase
          .from("class_occurrences")
          .select("id, hora, class_series(titulo, lugar, academia_id)")
          .eq("fecha", hoy)
          .eq("estado", "programada")
          .order("hora"),
        supabase
          .from("events")
          .select("*")
          .gte("fecha", hoy)
          .order("fecha")
          .order("hora")
          .limit(4),
        supabase
          .from("gigs")
          .select("*")
          .in("estado", ["cotizado", "confirmado"])
          .gte("fecha", hoy)
          .order("fecha")
          .limit(4),
      ])

      setAcademias((academiasData as Academy[]) ?? [])
      setAlumnos((alumnosData as AlumnoRaw[]) ?? [])

      type PagoConStudentEmbed = { monto: number; students: { academia_id: string | null } | { academia_id: string | null }[] | null }
      const normalizarEmbed = <T,>(valor: T | T[] | null): T | null =>
        Array.isArray(valor) ? (valor[0] ?? null) : valor

      setPagosMes(
        ((pagosMesData as PagoConStudentEmbed[] | null) ?? []).map((p) => ({
          monto: Number(p.monto),
          academia_id: normalizarEmbed(p.students)?.academia_id ?? null,
        })),
      )
      setGigsMes(
        ((gigsMesData as { pago: number; academia_id: string | null }[] | null) ?? []).map((g) => ({
          monto: Number(g.pago),
          academia_id: g.academia_id,
        })),
      )
      setGastos(
        ((gastosData as { monto: number; academia_id: string | null }[] | null) ?? []).map((g) => ({
          monto: Number(g.monto),
          academia_id: g.academia_id,
        })),
      )
      setPagosPendientesRaw(
        ((pagosPendientesData as PagoConStudentEmbed[] | null) ?? []).map((p) => ({
          monto: Number(p.monto),
          academia_id: normalizarEmbed(p.students)?.academia_id ?? null,
        })),
      )

      type PagoRetencionEmbed = {
        alumno_id: string
        fecha_vencimiento: string | null
        students:
          | { nombre: string; contacto: string | null; academia_id: string | null }
          | { nombre: string; contacto: string | null; academia_id: string | null }[]
          | null
      }
      setPagosRetencion(
        ((pagosParaRetencion as PagoRetencionEmbed[] | null) ?? []).map((p) => {
          const alumno = normalizarEmbed(p.students)
          return {
            alumno_id: p.alumno_id,
            fecha_vencimiento: p.fecha_vencimiento,
            academia_id: alumno?.academia_id ?? null,
            nombre: alumno?.nombre ?? "Alumno",
            contacto: alumno?.contacto ?? null,
          }
        }),
      )

      type OcurrenciaEmbed = {
        id: string
        hora: string
        class_series:
          | { titulo: string; lugar: string | null; academia_id: string | null }
          | { titulo: string; lugar: string | null; academia_id: string | null }[]
          | null
      }
      setClasesHoy(
        ((ocurrenciasHoy as OcurrenciaEmbed[] | null) ?? []).map((o) => {
          const serie = normalizarEmbed(o.class_series)
          return {
            id: o.id,
            hora: o.hora,
            titulo: serie?.titulo ?? "Clase",
            lugar: serie?.lugar ?? null,
            academia_id: serie?.academia_id ?? null,
          }
        }),
      )
      setProximosEventos((eventos as EventoDM[]) ?? [])
      setProximosContratos((contratos as Gig[]) ?? [])

      setCargando(false)
    }

    cargar()
  }, [])

  const coincideSede = useMemo(() => {
    return (academiaId: string | null) => {
      if (filtroSede === TODAS_LAS_SEDES) return true
      if (filtroSede === SIN_SEDE) return !academiaId
      return academiaId === filtroSede
    }
  }, [filtroSede])

  const alumnosActivos = useMemo(
    () => alumnos.filter((a) => coincideSede(a.academia_id)).length,
    [alumnos, coincideSede],
  )

  const ingresosMes = useMemo(() => {
    const dePagos = pagosMes.filter((p) => coincideSede(p.academia_id)).reduce((acc, p) => acc + p.monto, 0)
    const deGigs = gigsMes.filter((g) => coincideSede(g.academia_id)).reduce((acc, g) => acc + g.monto, 0)
    return dePagos + deGigs
  }, [pagosMes, gigsMes, coincideSede])

  const gastosMes = useMemo(
    () => gastos.filter((g) => coincideSede(g.academia_id)).reduce((acc, g) => acc + g.monto, 0),
    [gastos, coincideSede],
  )

  const pagosPorVerificar = useMemo(
    () => pagosPendientesRaw.filter((p) => coincideSede(p.academia_id)).length,
    [pagosPendientesRaw, coincideSede],
  )

  const sinRenovar = useMemo(() => {
    const filtrados = pagosRetencion.filter((p) => coincideSede(p.academia_id))
    const paraRetencion = filtrados.map((p) => ({
      alumno_id: p.alumno_id,
      fecha_vencimiento: p.fecha_vencimiento,
      students: { nombre: p.nombre, contacto: p.contacto },
    }))
    return calcularAlumnosSinRenovar(paraRetencion, fechaHoy()).length
  }, [pagosRetencion, coincideSede])

  const clasesHoyFiltradas = useMemo(
    () => clasesHoy.filter((c) => coincideSede(c.academia_id)),
    [clasesHoy, coincideSede],
  )

  const proximosContratosFiltrados = useMemo(
    () => proximosContratos.filter((g) => coincideSede(g.academia_id)),
    [proximosContratos, coincideSede],
  )

  if (cargando) return <p className="text-sm text-text-muted">Cargando...</p>

  const gananciaNeta = ingresosMes - gastosMes

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-text">Inicio</h1>
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

      {filtroSede !== TODAS_LAS_SEDES && (
        <p className="text-xs text-text-muted">
          Los gastos y contratos registrados antes de asignarles sede cuentan como "Sin sede".
          "Próximos eventos" no se puede filtrar todavía: esa tabla no tiene dato de sede.
        </p>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="border-l-4 border-l-success">
          <CardContent className="py-4">
            <p className="mb-1 text-xs uppercase tracking-wider text-text-muted">
              Ingresos (mes)
            </p>
            <p className="text-2xl font-bold text-success">{formatearMoneda(ingresosMes)}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-error">
          <CardContent className="py-4">
            <p className="mb-1 text-xs uppercase tracking-wider text-text-muted">Gastos (mes)</p>
            <p className="text-2xl font-bold text-error">{formatearMoneda(gastosMes)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <p className="mb-1 text-xs uppercase tracking-wider text-text-muted">
              Ganancia neta (mes)
            </p>
            <p className={`text-2xl font-bold ${gananciaNeta >= 0 ? "text-success" : "text-error"}`}>
              {formatearMoneda(gananciaNeta)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <p className="mb-1 text-xs uppercase tracking-wider text-text-muted">
              Alumnos activos
            </p>
            <p className="flex items-center gap-2 text-2xl font-bold text-text">
              <Users className="size-5 text-brand-light" />
              {alumnosActivos}
            </p>
          </CardContent>
        </Card>
      </div>

      {pagosPorVerificar > 0 && (
        <Link
          to="/admin/pagos"
          className="flex items-center justify-between gap-3 rounded-control border border-warning/30 bg-warning/10 p-4 transition-colors hover:bg-warning/15"
        >
          <div className="flex items-center gap-3">
            <Clock className="size-5 shrink-0 text-warning" />
            <div>
              <p className="font-semibold text-warning">
                {pagosPorVerificar} comprobante{pagosPorVerificar === 1 ? "" : "s"} por verificar
              </p>
              <p className="text-sm text-text-muted">Revísalos en Pagos.</p>
            </div>
          </div>
        </Link>
      )}

      {sinRenovar > 0 && (
        <Link
          to="/admin/retencion"
          className="flex items-center gap-3 rounded-control border border-error/30 bg-error/10 p-4 transition-colors hover:bg-error/15"
        >
          <AlertTriangle className="size-5 shrink-0 text-error" />
          <div>
            <p className="font-semibold text-error">
              {sinRenovar} alumno{sinRenovar === 1 ? "" : "s"} sin renovar
            </p>
            <p className="text-sm text-text-muted">Revisa el seguimiento en Retención.</p>
          </div>
        </Link>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardContent className="py-4">
            <h2 className="mb-4 font-semibold text-text">Clases de hoy</h2>
            {clasesHoyFiltradas.length === 0 ? (
              <p className="text-sm text-text-muted">No hay clases agendadas para hoy.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {clasesHoyFiltradas.map((c) => (
                  <div key={c.id} className="rounded-control border border-white/10 p-3">
                    <p className="font-medium text-text">
                      {c.hora.slice(0, 5)} · {c.titulo}
                    </p>
                    {c.lugar && <p className="text-xs text-text-muted">{c.lugar}</p>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <h2 className="mb-4 flex items-center gap-2 font-semibold text-text">
              <PartyPopper className="size-5 text-brand-light" />
              Próximos eventos
            </h2>
            {proximosEventos.length === 0 ? (
              <p className="text-sm text-text-muted">No hay eventos próximos.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {proximosEventos.map((e) => (
                  <div key={e.id} className="rounded-control border border-white/10 p-3">
                    <p className="font-medium text-text">{e.titulo}</p>
                    <p className="text-xs text-text-muted">
                      {formatearFecha(e.fecha)} · {e.hora.slice(0, 5)}
                      {e.lugar ? ` · ${e.lugar}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <h2 className="mb-4 flex items-center gap-2 font-semibold text-text">
              <Music className="size-5 text-brand-light" />
              Próximos contratos
            </h2>
            {proximosContratosFiltrados.length === 0 ? (
              <p className="text-sm text-text-muted">No hay contratos próximos.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {proximosContratosFiltrados.map((g) => (
                  <div key={g.id} className="rounded-control border border-white/10 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-text">{g.evento}</p>
                      <Badge variant={g.estado === "confirmado" ? "success" : "warning"}>
                        {g.estado}
                      </Badge>
                    </div>
                    <p className="text-xs text-text-muted">
                      {formatearFecha(g.fecha)} · {formatearMoneda(g.pago)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
