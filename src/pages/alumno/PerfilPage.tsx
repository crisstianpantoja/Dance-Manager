import { LogOut, Pencil } from "lucide-react"
import { useEffect, useState } from "react"

import { CarnetDownloadButton } from "@/components/alumno/CarnetDownloadButton"
import { CompetencyRadar } from "@/components/alumno/CompetencyRadar"
import { DigitalCard } from "@/components/alumno/DigitalCard"
import { ThemePicker } from "@/components/alumno/ThemePicker"
import { EditProfileDialog } from "@/pages/alumno/EditProfileDialog"
import { ReportarPagoDialog } from "@/pages/alumno/ReportarPagoDialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useAuth } from "@/context/AuthContext"
import { fechaHoy } from "@/lib/attendance"
import type { ThemeId } from "@/lib/carnet"
import { listarEvaluaciones } from "@/lib/evaluations"
import { formatearFecha } from "@/lib/format"
import { aceptarTerminos } from "@/lib/studentPortal"
import { supabase } from "@/lib/supabase"
import type { StudentEvaluation } from "@/types/evaluation"
import type { Payment } from "@/types/payment"
import type { Plan } from "@/types/plan"
import type { Student } from "@/types/student"

const TERMINOS = `Al usar el carnet digital de Dance Manager aceptas el reglamento interno
de la academia: puntualidad en las clases, cuidado de las instalaciones y
uso responsable de los cupos reservados. El plan adquirido es personal e
intransferible.`

const TIPO_LABEL: Record<Student["tipo"], string> = {
  academia: "Academia",
  privada: "Privada",
  ambas: "Academia + privada",
}

export function PerfilPage() {
  const { profile, signOut } = useAuth()
  const [alumno, setAlumno] = useState<Student | null>(null)
  const [academiaNombre, setAcademiaNombre] = useState<string | null>(null)
  const [pagos, setPagos] = useState<Payment[]>([])
  const [planesActivos, setPlanesActivos] = useState<Plan[]>([])
  const [evaluaciones, setEvaluaciones] = useState<StudentEvaluation[]>([])
  const [cargando, setCargando] = useState(true)
  const [aceptando, setAceptando] = useState(false)
  const [dialogoAbierto, setDialogoAbierto] = useState(false)
  const [editarAbierto, setEditarAbierto] = useState(false)

  async function cargarDatos(silencioso = false) {
    if (!profile?.id) return
    if (!silencioso) setCargando(true)

    const [{ data: alumnoData }, { data: pagosData }, { data: planesData }, evaluacionesData] =
      await Promise.all([
        supabase.from("students").select("*").eq("id", profile.id).single(),
        supabase
          .from("payments")
          .select("*")
          .eq("alumno_id", profile.id)
          .order("fecha", { ascending: false }),
        supabase.from("plans").select("*").eq("activo", true).order("nombre"),
        listarEvaluaciones(profile.id).catch(() => [] as StudentEvaluation[]),
      ])

    setAlumno((alumnoData as Student) ?? null)
    setPagos((pagosData as Payment[]) ?? [])
    setPlanesActivos((planesData as Plan[]) ?? [])
    setEvaluaciones(evaluacionesData)

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

  useEffect(() => {
    // El admin/profesor puede registrar una asistencia mientras el alumno
    // tiene esta pantalla abierta en otro dispositivo: refresca sola al
    // volver a la pestaña y cada cierto tiempo, sin recargar la página.
    function alVolverAEnfocar() {
      if (document.visibilityState === "visible") cargarDatos(true)
    }

    window.addEventListener("focus", alVolverAEnfocar)
    document.addEventListener("visibilitychange", alVolverAEnfocar)
    const intervalo = window.setInterval(() => cargarDatos(true), 15000)

    return () => {
      window.removeEventListener("focus", alVolverAEnfocar)
      document.removeEventListener("visibilitychange", alVolverAEnfocar)
      window.clearInterval(intervalo)
    }
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

  async function handleCambiarTema(id: ThemeId) {
    if (!alumno) return
    const anterior = alumno.tema_carnet
    setAlumno({ ...alumno, tema_carnet: id })

    const { error } = await supabase
      .from("students")
      .update({ tema_carnet: id })
      .eq("id", alumno.id)

    if (error) {
      setAlumno((actual) => (actual ? { ...actual, tema_carnet: anterior } : actual))
    }
  }

  if (cargando || !alumno) {
    return <p className="text-sm text-text-muted">Cargando...</p>
  }

  const hoy = fechaHoy()
  const planesVigentes = pagos.filter(
    (pago) => pago.estado === "pagado" && (!pago.fecha_vencimiento || pago.fecha_vencimiento >= hoy),
  )
  const ultimaEvaluacion = evaluaciones[0] ?? null
  const notasEvaluaciones = evaluaciones.filter((evaluacion) => evaluacion.nota?.trim())

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text">Mi perfil</h1>
        <Button variant="ghost" size="sm" onClick={signOut}>
          <LogOut className="size-4" />
          Salir
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-brand-dark via-brand to-brand-light" />
        <CardContent className="-mt-10 flex flex-col items-center gap-3 pb-6 text-center">
          <Avatar className="size-20 border-4 border-surface">
            <AvatarImage src={alumno.foto ?? undefined} alt={alumno.nombre} />
            <AvatarFallback className="text-lg">
              {alumno.nombre.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-lg font-semibold text-text">{alumno.nombre}</p>
            <p className="text-sm text-text-muted">{alumno.documento}</p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Badge>{alumno.nivel}</Badge>
            <Badge variant="muted">{TIPO_LABEL[alumno.tipo]}</Badge>
            <Badge variant="muted">{academiaNombre ?? "Sin academia"}</Badge>
          </div>
          <Button variant="outline" size="sm" onClick={() => setEditarAbierto(true)}>
            <Pencil className="size-4" />
            Editar perfil
          </Button>
        </CardContent>
      </Card>

      {planesVigentes.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-text-muted">Mi membresía</p>
          <Card>
            <CardContent className="flex flex-col gap-4 py-4">
              {planesVigentes.map((pago) => {
                const ilimitada = pago.modalidad === "ilimitada"
                const restantes = Math.max(0, pago.clases_incluidas - pago.clases_usadas)
                const porcentaje =
                  !ilimitada && pago.clases_incluidas > 0
                    ? Math.min(100, (pago.clases_usadas / pago.clases_incluidas) * 100)
                    : 100

                return (
                  <div key={pago.id} className="flex flex-col gap-2">
                    <div className="flex items-center justify-between text-sm">
                      <p className="font-medium text-text">{pago.concepto}</p>
                      <p className="text-text-muted">
                        {ilimitada ? "Clases ilimitadas" : `${restantes} clases restantes`}
                      </p>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-hover">
                      <div
                        className="h-full rounded-full bg-brand transition-all"
                        style={{ width: `${porcentaje}%` }}
                      />
                    </div>
                    {pago.fecha_vencimiento && (
                      <p className="text-xs text-text-muted">
                        Vence {formatearFecha(pago.fecha_vencimiento)}
                      </p>
                    )}
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-text-muted">Mi carnet</p>
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-6">
            <DigitalCard alumno={alumno} />
            <ThemePicker value={alumno.tema_carnet} onChange={handleCambiarTema} />
            <CarnetDownloadButton alumno={alumno} />
            <p className="text-xs text-text-muted">
              Muestra este código en la puerta para registrar tu asistencia.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-text-muted">Mis competencias</p>
        <Card>
          <CardContent className="flex flex-col gap-4 py-4">
            {ultimaEvaluacion ? (
              <>
                <CompetencyRadar evaluacion={ultimaEvaluacion} />
                {notasEvaluaciones.length > 0 && (
                  <div className="flex flex-col gap-3 border-t border-white/10 pt-4">
                    <p className="text-sm font-medium text-text">Notas del profesor</p>
                    {notasEvaluaciones.map((evaluacion) => (
                      <div key={evaluacion.id} className="flex flex-col gap-1">
                        <p className="text-xs text-text-muted">
                          {formatearFecha(evaluacion.fecha)}
                        </p>
                        <p className="text-sm text-text">{evaluacion.nota}</p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="py-2 text-center text-sm text-text-muted">
                Aún no tienes evaluaciones registradas.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

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
          <p className="text-sm font-semibold text-text-muted">Mis pagos</p>
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

      <EditProfileDialog
        open={editarAbierto}
        onOpenChange={setEditarAbierto}
        alumno={alumno}
        onSaved={cargarDatos}
      />
    </div>
  )
}
