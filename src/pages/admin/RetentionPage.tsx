import { Bell, MessageCircle, RefreshCw } from "lucide-react"
import { useEffect, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useAuth } from "@/context/AuthContext"
import { fechaHoy } from "@/lib/attendance"
import { formatearFecha } from "@/lib/format"
import { calcularAlumnosSinRenovar, construirEnlaceWhatsApp, type AlumnoSinRenovar } from "@/lib/retention"
import { supabase } from "@/lib/supabase"
import type { NotificationDM } from "@/types/notification"

export function RetentionPage() {
  const { profile } = useAuth()
  const [alumnos, setAlumnos] = useState<AlumnoSinRenovar[]>([])
  const [notificaciones, setNotificaciones] = useState<NotificationDM[]>([])
  const [cargando, setCargando] = useState(true)
  const [actualizando, setActualizando] = useState(false)

  async function cargarDatos() {
    setCargando(true)

    const [{ data: pagos }, { data: notifs }] = await Promise.all([
      supabase
        .from("payments")
        .select("alumno_id, fecha_vencimiento, students(nombre, contacto)")
        .eq("estado", "pagado"),
      profile?.id
        ? supabase
            .from("notifications")
            .select("*")
            .eq("user_id", profile.id)
            .order("fecha", { ascending: false })
            .limit(20)
        : Promise.resolve({ data: [] as NotificationDM[] }),
    ])

    const pagosNormalizados = (pagos ?? []).map((p) => ({
      alumno_id: p.alumno_id,
      fecha_vencimiento: p.fecha_vencimiento,
      students: Array.isArray(p.students) ? (p.students[0] ?? null) : p.students,
    }))

    setAlumnos(calcularAlumnosSinRenovar(pagosNormalizados, fechaHoy()))
    setNotificaciones((notifs as NotificationDM[]) ?? [])
    setCargando(false)
  }

  useEffect(() => {
    cargarDatos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id])

  async function actualizarAlertas() {
    setActualizando(true)
    const { error } = await supabase.rpc("generar_alertas_renovacion")
    setActualizando(false)

    if (error) {
      alert("No se pudieron generar las alertas: " + error.message)
      return
    }
    cargarDatos()
  }

  async function marcarLeida(notificacion: NotificationDM) {
    await supabase.from("notifications").update({ leida: true }).eq("id", notificacion.id)
    cargarDatos()
  }

  const noLeidas = notificaciones.filter((n) => !n.leida)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text">Retención</h1>
        <Button size="sm" variant="outline" onClick={actualizarAlertas} disabled={actualizando}>
          <RefreshCw className="size-4" />
          {actualizando ? "Actualizando..." : "Actualizar alertas"}
        </Button>
      </div>

      {noLeidas.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="flex items-center gap-2 text-sm font-semibold text-text-muted">
            <Bell className="size-4" />
            Alertas nuevas
          </p>
          {noLeidas.map((n) => (
            <Card key={n.id}>
              <CardContent className="flex items-center justify-between py-3">
                <p className="text-sm text-text">{n.mensaje}</p>
                <Button variant="ghost" size="sm" onClick={() => marcarLeida(n)}>
                  Marcar leída
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-text-muted">Sin renovar</p>
        <p className="text-xs text-text-muted">
          Alumnos con un plan vencido que todavía no han comprado uno nuevo. A partir de
          los 8 días se genera una alerta automática.
        </p>

        {cargando ? (
          <p className="text-sm text-text-muted">Cargando...</p>
        ) : alumnos.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-sm text-text-muted">
              No hay alumnos pendientes de renovar. 🎉
            </CardContent>
          </Card>
        ) : (
          alumnos.map((alumno) => (
            <Card key={alumno.alumnoId}>
              <CardContent className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-text">{alumno.nombre}</p>
                  <p className="text-xs text-text-muted">
                    Venció {formatearFecha(alumno.fechaVencimiento)} · {alumno.diasVencido} días
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {alumno.diasVencido >= 8 && <Badge variant="warning">Requiere contacto</Badge>}
                  {alumno.contacto ? (
                    <Button size="sm" variant="outline" asChild>
                      <a
                        href={construirEnlaceWhatsApp(
                          alumno.contacto,
                          alumno.nombre,
                          formatearFecha(alumno.fechaVencimiento),
                        )}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <MessageCircle className="size-4" />
                        WhatsApp
                      </a>
                    </Button>
                  ) : (
                    <Badge variant="muted">Sin contacto</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
