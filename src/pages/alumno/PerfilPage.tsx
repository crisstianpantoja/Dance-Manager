import { LogOut } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import { useEffect, useState } from "react"

import { ReportarPagoDialog } from "@/pages/alumno/ReportarPagoDialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useAuth } from "@/context/AuthContext"
import { fechaHoy } from "@/lib/attendance"
import { formatearFecha } from "@/lib/format"
import { aceptarTerminos } from "@/lib/studentPortal"
import { supabase } from "@/lib/supabase"
import type { Payment } from "@/types/payment"
import type { Plan } from "@/types/plan"
import type { Student } from "@/types/student"

const TERMINOS = `Al usar el carnet digital de Dance Manager aceptas el reglamento interno
de la academia: puntualidad en las clases, cuidado de las instalaciones y
uso responsable de los cupos reservados. El plan adquirido es personal e
intransferible.`

export function PerfilPage() {
  const { profile, signOut } = useAuth()
  const [alumno, setAlumno] = useState<Student | null>(null)
  const [academiaNombre, setAcademiaNombre] = useState<string | null>(null)
  const [pagos, setPagos] = useState<Payment[]>([])
  const [planesActivos, setPlanesActivos] = useState<Plan[]>([])
  const [cargando, setCargando] = useState(true)
  const [aceptando, setAceptando] = useState(false)
  const [dialogoAbierto, setDialogoAbierto] = useState(false)

  async function cargarDatos() {
    if (!profile?.id) return
    setCargando(true)

    const [{ data: alumnoData }, { data: pagosData }, { data: planesData }] =
      await Promise.all([
        supabase.from("students").select("*").eq("id", profile.id).single(),
        supabase
          .from("payments")
          .select("*")
          .eq("alumno_id", profile.id)
          .order("fecha", { ascending: false }),
        supabase.from("plans").select("*").eq("activo", true).order("nombre"),
      ])

    setAlumno((alumnoData as Student) ?? null)
    setPagos((pagosData as Payment[]) ?? [])
    setPlanesActivos((planesData as Plan[]) ?? [])

    if (alumnoData?.academia_id) {
      const { data: academia } = await supabase
        .from("academies")
        .select("nombre")
        .eq("id", alumnoData.academia_id)
        .single()
      setAcademiaNombre(academia?.nombre ?? null)
    }

    setCargando(false)
  }

  useEffect(() => {
    cargarDatos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id])

  async function handleAceptarTerminos() {
    if (!alumno) return
    setAceptando(true)
    try {
      await aceptarTerminos(alumno.id)
      cargarDatos()
    } catch {
      alert("No se pudo registrar la aceptación. Intenta de nuevo.")
    } finally {
      setAceptando(false)
    }
  }

  if (cargando || !alumno) {
    return <p className="text-sm text-text-muted">Cargando...</p>
  }

  const hoy = fechaHoy()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text">Mi carnet</h1>
        <Button variant="ghost" size="sm" onClick={signOut}>
          <LogOut className="size-4" />
          Salir
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-6 text-center">
          <Avatar className="size-20">
            <AvatarImage src={alumno.foto ?? undefined} alt={alumno.nombre} />
            <AvatarFallback className="text-lg">
              {alumno.nombre.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-lg font-semibold text-text">{alumno.nombre}</p>
            <p className="text-sm text-text-muted">{alumno.documento}</p>
          </div>
          <div className="flex gap-2">
            <Badge>{alumno.nivel}</Badge>
            <Badge variant="muted">{academiaNombre ?? "Sin academia"}</Badge>
          </div>

          <div className="rounded-control bg-white p-3">
            <QRCodeSVG value={alumno.documento} size={168} />
          </div>
          <p className="text-xs text-text-muted">
            Muestra este código en la puerta para registrar tu asistencia.
          </p>
        </CardContent>
      </Card>

      {!alumno.acepto_terminos && (
        <Card>
          <CardContent className="flex flex-col gap-3 py-4">
            <p className="text-sm font-medium text-text">Términos y condiciones</p>
            <p className="text-sm text-text-muted">{TERMINOS}</p>
            <Button onClick={handleAceptarTerminos} disabled={aceptando}>
              {aceptando ? "Guardando..." : "Aceptar términos"}
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-text-muted">Mis planes</p>
          <Button size="sm" variant="outline" onClick={() => setDialogoAbierto(true)}>
            Reportar pago
          </Button>
        </div>

        {pagos.length === 0 ? (
          <Card>
            <CardContent className="py-4 text-center text-sm text-text-muted">
              Aún no tienes planes registrados.
            </CardContent>
          </Card>
        ) : (
          pagos.map((pago) => {
            const vencido = pago.fecha_vencimiento ? pago.fecha_vencimiento < hoy : false
            const restantes = Math.max(0, pago.clases_incluidas - pago.clases_usadas)

            return (
              <Card key={pago.id}>
                <CardContent className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-text">{pago.concepto}</p>
                    <p className="text-xs text-text-muted">
                      {pago.modalidad === "ilimitada"
                        ? "Clases ilimitadas"
                        : `${restantes} clases restantes`}
                      {pago.fecha_vencimiento
                        ? ` · vence ${formatearFecha(pago.fecha_vencimiento)}`
                        : ""}
                    </p>
                  </div>
                  <Badge
                    variant={
                      pago.estado === "pendiente"
                        ? "warning"
                        : pago.estado === "rechazado"
                          ? "error"
                          : vencido
                            ? "muted"
                            : "success"
                    }
                  >
                    {pago.estado === "pagado"
                      ? vencido
                        ? "Vencido"
                        : "Activo"
                      : pago.estado === "pendiente"
                        ? "En revisión"
                        : "Rechazado"}
                  </Badge>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      <ReportarPagoDialog
        open={dialogoAbierto}
        onOpenChange={setDialogoAbierto}
        alumnoId={alumno.id}
        planes={planesActivos}
        onReportado={cargarDatos}
      />
    </div>
  )
}
