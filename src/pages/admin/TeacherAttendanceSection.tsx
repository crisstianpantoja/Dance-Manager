import { Camera, CameraOff, Check, UserX } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { QrScannerView } from "@/components/QrScannerView"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { formatearFecha, formatearMoneda } from "@/lib/format"
import {
  cargarClasesProfesorHoy,
  cargarPendientesDeValidar,
  confirmarAsistenciaManual,
  identificarProfesorPorQr,
  marcarAusenteProfesor,
  registrarAsistenciaProfesor,
  type PendienteValidar,
  type ProfesorIdentificado,
} from "@/lib/teacherAttendance"
import type { ClaseProfesorHoy } from "@/types/classOccurrenceTeacher"

interface Banner {
  mensaje: string
  exito: boolean
}

export function TeacherAttendanceSection() {
  const [camaraActiva, setCamaraActiva] = useState(false)
  const [buscando, setBuscando] = useState(false)
  const [banner, setBanner] = useState<Banner | null>(null)

  const [profesor, setProfesor] = useState<ProfesorIdentificado | null>(null)
  const [candidatas, setCandidatas] = useState<ClaseProfesorHoy[]>([])
  const [confirmando, setConfirmando] = useState<string | null>(null)

  const [pendientes, setPendientes] = useState<PendienteValidar[]>([])
  const [cargandoPendientes, setCargandoPendientes] = useState(true)
  const [resolviendo, setResolviendo] = useState<string | null>(null)

  const ultimoEscaneo = useRef<{ valor: string; ts: number } | null>(null)

  async function cargarPendientes() {
    setCargandoPendientes(true)
    try {
      setPendientes(await cargarPendientesDeValidar())
    } catch {
      // silencioso: no bloquea el escaneo si esto falla
    } finally {
      setCargandoPendientes(false)
    }
  }

  useEffect(() => {
    cargarPendientes()
  }, [])

  useEffect(() => {
    if (!banner) return
    const t = setTimeout(() => setBanner(null), 5000)
    return () => clearTimeout(t)
  }, [banner])

  function limpiarIdentificacion() {
    setProfesor(null)
    setCandidatas([])
  }

  async function procesarToken(token: string) {
    if (buscando) return
    setBuscando(true)
    limpiarIdentificacion()

    try {
      const encontrado = await identificarProfesorPorQr(token)
      if (!encontrado) {
        setBanner({ mensaje: "Este QR no corresponde a ningún profesor.", exito: false })
        return
      }
      if (!encontrado.activo) {
        setBanner({ mensaje: `${encontrado.nombre} está marcado como inactivo.`, exito: false })
        return
      }

      const clases = await cargarClasesProfesorHoy(encontrado.profesor_id)
      setProfesor(encontrado)
      setCandidatas(clases)

      if (clases.length === 0) {
        setBanner({ mensaje: `${encontrado.nombre} no tiene clases pendientes hoy.`, exito: false })
      }
    } catch (err) {
      setBanner({
        mensaje: err instanceof Error ? err.message : "No se pudo identificar el QR.",
        exito: false,
      })
    } finally {
      setBuscando(false)
    }
  }

  function handleDetectado(valor: string) {
    if (!valor) return
    const ahora = Date.now()
    if (ultimoEscaneo.current && ultimoEscaneo.current.valor === valor && ahora - ultimoEscaneo.current.ts < 4000) {
      return
    }
    ultimoEscaneo.current = { valor, ts: ahora }
    setCamaraActiva(false)
    procesarToken(valor)
  }

  async function confirmar(clase: ClaseProfesorHoy) {
    if (!profesor) return
    setConfirmando(clase.occurrenceTeacherId)
    try {
      const valor = await registrarAsistenciaProfesor(clase.occurrenceId, profesor.profesor_id)
      setBanner({
        mensaje: `${profesor.nombre}: asistencia registrada (${formatearMoneda(valor ?? 0)}).`,
        exito: true,
      })
      limpiarIdentificacion()
      cargarPendientes()
    } catch (err) {
      setBanner({
        mensaje: err instanceof Error ? err.message : "No se pudo registrar la asistencia.",
        exito: false,
      })
    } finally {
      setConfirmando(null)
    }
  }

  async function confirmarPendiente(item: PendienteValidar) {
    setResolviendo(item.occurrenceTeacherId)
    try {
      await confirmarAsistenciaManual(item.occurrenceId, item.profesorId, undefined, "Confirmado desde bandeja de pendientes")
      cargarPendientes()
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo confirmar la asistencia.")
    } finally {
      setResolviendo(null)
    }
  }

  async function marcarNoAsistio(item: PendienteValidar) {
    if (!confirm(`¿Marcar que ${item.profesorNombre} no asistió a "${item.titulo}" del ${formatearFecha(item.fecha)}?`)) return
    setResolviendo(item.occurrenceTeacherId)
    try {
      await marcarAusenteProfesor(item.occurrenceId, item.profesorId, "Marcado desde bandeja de pendientes")
      cargarPendientes()
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo actualizar.")
    } finally {
      setResolviendo(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {banner && (
        <div
          className={
            "rounded-control px-4 py-3 text-sm " +
            (banner.exito ? "bg-success/10 text-success" : "bg-warning/10 text-warning")
          }
        >
          {banner.mensaje}
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-control border border-border bg-surface p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-text">Escanear carnet del profesor (QR)</p>
          <Button variant="outline" size="sm" onClick={() => setCamaraActiva((v) => !v)}>
            {camaraActiva ? <CameraOff className="size-4" /> : <Camera className="size-4" />}
            {camaraActiva ? "Detener lectura" : "Leer QR"}
          </Button>
        </div>

        {camaraActiva && (
          <div className="overflow-hidden rounded-control">
            <QrScannerView
              onScan={handleDetectado}
              onError={(mensaje) => setBanner({ mensaje, exito: false })}
              className="w-full"
            />
          </div>
        )}

        {buscando && <p className="text-sm text-text-muted">Buscando...</p>}
      </div>

      {profesor && candidatas.length > 0 && (
        <Card>
          <CardContent className="flex flex-col gap-3 py-4">
            <div className="flex items-center gap-3">
              <Avatar className="size-10">
                <AvatarImage src={profesor.foto ?? undefined} alt={profesor.nombre} />
                <AvatarFallback>{profesor.nombre.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-text">{profesor.nombre}</p>
                <p className="text-xs text-text-muted">
                  {candidatas.length === 1 ? "Confirma su clase de hoy" : "Elige a cuál clase corresponde"}
                </p>
              </div>
            </div>

            {candidatas.map((clase) => (
              <div
                key={clase.occurrenceTeacherId}
                className="flex items-center justify-between rounded-control border border-border px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-text">
                    {clase.hora.slice(0, 5)} · {clase.titulo}
                  </p>
                  <p className="text-xs text-text-muted">
                    {clase.lugar ?? "Sin sede"}
                    {clase.valorPrevisto != null ? ` · ${formatearMoneda(clase.valorPrevisto)}` : " · tarifa pendiente de configurar"}
                  </p>
                </div>
                <Button
                  size="sm"
                  disabled={confirmando === clase.occurrenceTeacherId || clase.valorPrevisto == null}
                  onClick={() => confirmar(clase)}
                >
                  {confirmando === clase.occurrenceTeacherId ? "Confirmando..." : "Confirmar"}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-text-muted">Pendientes de validar</p>
        <p className="text-xs text-text-muted">
          Clases ya pasadas donde el profesor asignado no tiene asistencia registrada.
        </p>

        {cargandoPendientes ? (
          <p className="text-sm text-text-muted">Cargando...</p>
        ) : pendientes.length === 0 ? (
          <Card>
            <CardContent className="py-4 text-center text-sm text-text-muted">
              No hay nada pendiente de validar.
            </CardContent>
          </Card>
        ) : (
          pendientes.map((item) => (
            <Card key={item.occurrenceTeacherId}>
              <CardContent className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-medium text-text">{item.profesorNombre}</p>
                  <p className="text-xs text-text-muted">
                    {item.titulo}
                    {item.lugar ? ` · ${item.lugar}` : ""} · {formatearFecha(item.fecha)}{" "}
                    {item.hora.slice(0, 5)}
                  </p>
                  <Badge variant="warning" className="mt-1">
                    {item.valorPrevisto != null
                      ? `Tarifa prevista ${formatearMoneda(item.valorPrevisto)}`
                      : "Tarifa pendiente de configurar"}
                  </Badge>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    title="No asistió"
                    disabled={resolviendo === item.occurrenceTeacherId}
                    onClick={() => marcarNoAsistio(item)}
                  >
                    <UserX className="size-4 text-error" />
                  </Button>
                  <Button
                    size="icon"
                    title="Confirmar asistencia"
                    disabled={resolviendo === item.occurrenceTeacherId || item.valorPrevisto == null}
                    onClick={() => confirmarPendiente(item)}
                  >
                    <Check className="size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
