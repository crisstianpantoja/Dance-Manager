import { Scanner, type IDetectedBarcode } from "@yudiel/react-qr-scanner"
import { Camera, CameraOff, RotateCcw, UserPlus } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { RegistroAsistenciaDialog } from "@/pages/admin/RegistroAsistenciaDialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  anularAsistencia,
  cargarOcurrenciasDeHoy,
  fechaHoy,
  horaAhora,
  registrarAsistencia,
} from "@/lib/attendance"
import { decirClaseRegistrada, reproducirSonidoAdvertencia } from "@/lib/sound"
import { supabase } from "@/lib/supabase"
import {
  ES_ESTADO_EXITOSO,
  ETIQUETA_ESTADO_PLAN,
  type AttendanceRecord,
  type OcurrenciaHoy,
} from "@/types/attendance"
import type { Student } from "@/types/student"

interface RegistroDelDia extends AttendanceRecord {
  alumno_nombre: string
}

function mensajeRegistro(nombre: string, estadoPlan: AttendanceRecord["estado_plan"]) {
  return ES_ESTADO_EXITOSO[estadoPlan]
    ? `${nombre}: se registró la clase exitosamente (${ETIQUETA_ESTADO_PLAN[estadoPlan]})`
    : `${nombre}: ${ETIQUETA_ESTADO_PLAN[estadoPlan]}`
}

export function AttendancePage() {
  const [alumnos, setAlumnos] = useState<Student[]>([])
  const [ocurrencias, setOcurrencias] = useState<OcurrenciaHoy[]>([])
  const [registros, setRegistros] = useState<RegistroDelDia[]>([])
  const [cargando, setCargando] = useState(true)

  const [camaraActiva, setCamaraActiva] = useState(false)
  const [camaraKey, setCamaraKey] = useState(0)
  const contenedorCamaraRef = useRef<HTMLDivElement>(null)
  const [documentoManual, setDocumentoManual] = useState("")
  const [procesando, setProcesando] = useState(false)
  const [banner, setBanner] = useState<{ mensaje: string; exito: boolean } | null>(null)

  const [dialogoAbierto, setDialogoAbierto] = useState(false)
  const [alumnoParaDialogo, setAlumnoParaDialogo] = useState<Student | null>(null)

  const ultimoEscaneo = useRef<{ valor: string; ts: number } | null>(null)

  async function cargarTodo() {
    setCargando(true)
    const hoy = fechaHoy()

    const [{ data: alumnosData }, ocurrenciasData, { data: registrosData }] =
      await Promise.all([
        supabase.from("students").select("*").order("nombre"),
        cargarOcurrenciasDeHoy(),
        supabase
          .from("attendance_records")
          .select("*, students(nombre)")
          .eq("fecha", hoy)
          .order("created_at", { ascending: false }),
      ])

    setAlumnos((alumnosData as Student[]) ?? [])
    setOcurrencias(ocurrenciasData)
    setRegistros(
      ((registrosData as (AttendanceRecord & { students: { nombre: string } | null })[]) ?? []).map(
        (r) => ({ ...r, alumno_nombre: r.students?.nombre ?? "Alumno" }),
      ),
    )
    setCargando(false)
  }

  useEffect(() => {
    cargarTodo()
  }, [])

  useEffect(() => {
    if (!banner) return
    const timeout = setTimeout(() => setBanner(null), 5000)
    return () => clearTimeout(timeout)
  }, [banner])

  function mostrarBanner(mensaje: string, exito: boolean) {
    setBanner({ mensaje, exito })
    if (exito) decirClaseRegistrada()
    else reproducirSonidoAdvertencia()
  }

  function detenerVideosActivos(raiz: ParentNode) {
    raiz.querySelectorAll("video").forEach((video) => {
      const stream = video.srcObject as MediaStream | null
      stream?.getTracks().forEach((track) => track.stop())
      video.srcObject = null
    })
  }

  function apagarCamara() {
    // Respaldo por si la librería del lector no libera la cámara sola: paramos
    // cualquier <video> activo y forzamos un remount la próxima vez que se
    // active. El segundo barrido (con retraso) cubre el caso en que la
    // cámara apenas estaba inicializando cuando se detectó el QR y el
    // stream se conecta al <video> justo después de este primer intento.
    detenerVideosActivos(contenedorCamaraRef.current ?? document)
    setCamaraKey((k) => k + 1)
    setCamaraActiva(false)
    window.setTimeout(() => detenerVideosActivos(document), 400)
  }

  async function handleScan(documento: string, origen: "qr" | "manual") {
    const valor = documento.trim()
    if (!valor || procesando) return

    const alumno = alumnos.find((a) => a.documento === valor)
    if (!alumno) {
      mostrarBanner(`No se encontró ningún alumno con el documento ${valor}.`, false)
      return
    }

    if (origen === "qr") apagarCamara()
    setProcesando(true)

    try {
      // Backstop: una privada nunca se cuelga de la clase de grupo abierta.
      if (alumno.tipo === "privada") {
        const { estado_plan } = await registrarAsistencia(
          alumno.id,
          {
            clase_tipo: "manual",
            titulo: "Clase privada",
            categoria: "Privada",
            fecha: fechaHoy(),
            hora: horaAhora(),
          },
          origen,
        )
        mostrarBanner(mensajeRegistro(alumno.nombre, estado_plan), ES_ESTADO_EXITOSO[estado_plan])
        cargarTodo()
        return
      }

      if (ocurrencias.length === 0) {
        setAlumnoParaDialogo(alumno)
        setDialogoAbierto(true)
        return
      }

      if (ocurrencias.length === 1) {
        const oc = ocurrencias[0]
        const { estado_plan } = await registrarAsistencia(
          alumno.id,
          {
            clase_tipo: "academia",
            clase_id: oc.id,
            titulo: oc.titulo,
            categoria: oc.categoria,
            fecha: oc.fecha,
            hora: oc.hora,
            academia_id: oc.academia_id,
          },
          origen,
        )
        mostrarBanner(mensajeRegistro(alumno.nombre, estado_plan), ES_ESTADO_EXITOSO[estado_plan])
        cargarTodo()
        return
      }

      // Varias clases hoy: se pide elegir.
      setAlumnoParaDialogo(alumno)
      setDialogoAbierto(true)
    } catch (err) {
      mostrarBanner(
        err instanceof Error ? err.message : "No se pudo registrar la asistencia.",
        false,
      )
    } finally {
      setProcesando(false)
    }
  }

  function handleDetectado(codigos: IDetectedBarcode[]) {
    const valor = codigos[0]?.rawValue
    if (!valor) return

    const ahora = Date.now()
    if (
      ultimoEscaneo.current &&
      ultimoEscaneo.current.valor === valor &&
      ahora - ultimoEscaneo.current.ts < 4000
    ) {
      return
    }
    ultimoEscaneo.current = { valor, ts: ahora }
    handleScan(valor, "qr")
  }

  function abrirRegistroManual() {
    setAlumnoParaDialogo(null)
    setDialogoAbierto(true)
  }

  async function anular(registro: RegistroDelDia) {
    if (!confirm(`¿Anular la asistencia de "${registro.alumno_nombre}"?`)) return

    try {
      await anularAsistencia(registro.id)
      cargarTodo()
    } catch {
      alert("No se pudo anular la asistencia.")
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text">Asistencia</h1>
        <Button size="sm" variant="outline" onClick={abrirRegistroManual}>
          <UserPlus className="size-4" />
          Registro manual
        </Button>
      </div>

      {banner && (
        <div
          className={
            "rounded-control px-4 py-3 text-sm " +
            (banner.exito
              ? "bg-success/10 text-success"
              : "bg-warning/10 text-warning")
          }
        >
          {banner.mensaje}
        </div>
      )}

      {ocurrencias.length === 0 && (
        <p className="rounded-control bg-surface-hover px-4 py-3 text-sm text-text-muted">
          Hoy no hay clases programadas en el calendario, así que cada escaneo abre el
          registro manual. Cuando exista la programación (paso 5) esto se detecta solo.
        </p>
      )}

      <div className="flex flex-col gap-3 rounded-control border border-white/10 bg-surface p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-text">Escanear carnet (QR)</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => (camaraActiva ? apagarCamara() : setCamaraActiva(true))}
          >
            {camaraActiva ? <CameraOff className="size-4" /> : <Camera className="size-4" />}
            {camaraActiva ? "Detener lectura" : "Leer QR"}
          </Button>
        </div>

        {camaraActiva && (
          <div ref={contenedorCamaraRef} className="overflow-hidden rounded-control">
            <Scanner
              key={camaraKey}
              onScan={handleDetectado}
              onError={() => mostrarBanner("No se pudo acceder a la cámara.", false)}
              formats={["qr_code"]}
              styles={{ container: { width: "100%" } }}
            />
          </div>
        )}

        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            handleScan(documentoManual, "manual")
            setDocumentoManual("")
          }}
        >
          <Input
            placeholder="O escribe el documento del alumno"
            value={documentoManual}
            onChange={(e) => setDocumentoManual(e.target.value)}
          />
          <Button type="submit" variant="outline" disabled={procesando}>
            <RotateCcw className="size-4" />
            Registrar
          </Button>
        </form>
      </div>

      {cargando ? (
        <p className="text-sm text-text-muted">Cargando...</p>
      ) : registros.length === 0 ? (
        <p className="text-sm text-text-muted">Aún no hay asistencia registrada hoy.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Alumno</TableHead>
              <TableHead>Clase</TableHead>
              <TableHead>Hora</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-20 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {registros.map((registro) => (
              <TableRow key={registro.id} className={registro.anulado ? "opacity-50" : ""}>
                <TableCell className="font-medium text-text">
                  {registro.alumno_nombre}
                </TableCell>
                <TableCell className="text-text-muted">
                  {registro.titulo}
                  {registro.categoria ? ` · ${registro.categoria}` : ""}
                </TableCell>
                <TableCell className="text-text-muted">{registro.hora}</TableCell>
                <TableCell>
                  {registro.anulado ? (
                    <Badge variant="muted">Anulado</Badge>
                  ) : (
                    <Badge variant={ES_ESTADO_EXITOSO[registro.estado_plan] ? "success" : "warning"}>
                      {ETIQUETA_ESTADO_PLAN[registro.estado_plan]}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {!registro.anulado && (
                    <Button variant="ghost" size="sm" onClick={() => anular(registro)}>
                      Anular
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <RegistroAsistenciaDialog
        open={dialogoAbierto}
        onOpenChange={setDialogoAbierto}
        alumnoPreseleccionado={alumnoParaDialogo}
        alumnos={alumnos}
        ocurrencias={ocurrencias}
        onRegistrado={(mensaje, exito) => {
          mostrarBanner(mensaje, exito)
          cargarTodo()
        }}
      />
    </div>
  )
}
