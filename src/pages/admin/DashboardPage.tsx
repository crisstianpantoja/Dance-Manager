import { AlertTriangle, Clock, PartyPopper, Users } from "lucide-react"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"

import { Card, CardContent } from "@/components/ui/card"
import { fechaHoy } from "@/lib/attendance"
import { formatearFecha, formatearMoneda } from "@/lib/format"
import { calcularAlumnosSinRenovar } from "@/lib/retention"
import { supabase } from "@/lib/supabase"
import type { EventoDM } from "@/types/event"

interface ClaseHoy {
  id: string
  hora: string
  titulo: string
  lugar: string | null
}

export function DashboardPage() {
  const [cargando, setCargando] = useState(true)
  const [ingresosMes, setIngresosMes] = useState(0)
  const [alumnosActivos, setAlumnosActivos] = useState(0)
  const [pagosPorVerificar, setPagosPorVerificar] = useState(0)
  const [sinRenovar, setSinRenovar] = useState(0)
  const [clasesHoy, setClasesHoy] = useState<ClaseHoy[]>([])
  const [proximosEventos, setProximosEventos] = useState<EventoDM[]>([])

  useEffect(() => {
    async function cargar() {
      setCargando(true)
      const hoy = fechaHoy()
      const inicioMes = `${hoy.slice(0, 7)}-01`

      const [
        { count: totalAlumnos },
        { data: pagosMes },
        { count: pendientes },
        { data: pagosParaRetencion },
        { data: ocurrenciasHoy },
        { data: eventos },
      ] = await Promise.all([
        supabase.from("students").select("id", { count: "exact", head: true }),
        supabase
          .from("payments")
          .select("monto")
          .eq("estado", "pagado")
          .gte("fecha", inicioMes)
          .lte("fecha", hoy),
        supabase
          .from("payments")
          .select("id", { count: "exact", head: true })
          .eq("estado", "pendiente"),
        supabase
          .from("payments")
          .select("alumno_id, fecha_vencimiento, students(nombre, contacto)")
          .eq("estado", "pagado"),
        supabase
          .from("class_occurrences")
          .select("id, hora, class_series(titulo, lugar)")
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
      ])

      setAlumnosActivos(totalAlumnos ?? 0)
      setIngresosMes((pagosMes ?? []).reduce((acc, p) => acc + Number(p.monto), 0))
      setPagosPorVerificar(pendientes ?? 0)

      const pagosNormalizados = (pagosParaRetencion ?? []).map((p) => ({
        alumno_id: p.alumno_id,
        fecha_vencimiento: p.fecha_vencimiento,
        students: Array.isArray(p.students) ? (p.students[0] ?? null) : p.students,
      }))
      setSinRenovar(calcularAlumnosSinRenovar(pagosNormalizados, hoy).length)

      setClasesHoy(
        ((ocurrenciasHoy as
          | { id: string; hora: string; class_series: { titulo: string; lugar: string | null } | null }[]
          | null) ?? []
        ).map((o) => ({
          id: o.id,
          hora: o.hora,
          titulo: o.class_series?.titulo ?? "Clase",
          lugar: o.class_series?.lugar ?? null,
        })),
      )
      setProximosEventos((eventos as EventoDM[]) ?? [])

      setCargando(false)
    }

    cargar()
  }, [])

  if (cargando) return <p className="text-sm text-text-muted">Cargando...</p>

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight text-text">Inicio</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="border-l-4 border-l-success">
          <CardContent className="py-4">
            <p className="mb-1 text-xs uppercase tracking-wider text-text-muted">
              Ingresos (mes)
            </p>
            <p className="text-2xl font-bold text-success">{formatearMoneda(ingresosMes)}</p>
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

        <Card className={pagosPorVerificar > 0 ? "border-l-4 border-l-warning" : ""}>
          <CardContent className="py-4">
            <p className="mb-1 text-xs uppercase tracking-wider text-text-muted">
              Pagos por verificar
            </p>
            <p className="text-2xl font-bold text-warning">{pagosPorVerificar}</p>
          </CardContent>
        </Card>

        <Card className={sinRenovar > 0 ? "border-l-4 border-l-error" : ""}>
          <CardContent className="py-4">
            <p className="mb-1 text-xs uppercase tracking-wider text-text-muted">Sin renovar</p>
            <p className="text-2xl font-bold text-error">{sinRenovar}</p>
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="py-4">
            <h2 className="mb-4 font-semibold text-text">Clases de hoy</h2>
            {clasesHoy.length === 0 ? (
              <p className="text-sm text-text-muted">No hay clases agendadas para hoy.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {clasesHoy.map((c) => (
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
      </div>
    </div>
  )
}
