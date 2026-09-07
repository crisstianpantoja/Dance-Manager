import { useEffect, useState, type FormEvent } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { fechaHoy, horaAhora, registrarAsistencia } from "@/lib/attendance"
import { ES_ESTADO_EXITOSO, ETIQUETA_ESTADO_PLAN, type OcurrenciaHoy } from "@/types/attendance"
import type { Student } from "@/types/student"

const OTRA_CLASE = "otra"

interface RegistroAsistenciaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  alumnoPreseleccionado: Student | null
  alumnos: Student[]
  ocurrencias: OcurrenciaHoy[]
  onRegistrado: (mensaje: string, exito: boolean) => void
}

export function RegistroAsistenciaDialog({
  open,
  onOpenChange,
  alumnoPreseleccionado,
  alumnos,
  ocurrencias,
  onRegistrado,
}: RegistroAsistenciaDialogProps) {
  const [alumnoId, setAlumnoId] = useState("")
  const [ocurrenciaId, setOcurrenciaId] = useState<string>("")
  const [categoria, setCategoria] = useState("")
  const [titulo, setTitulo] = useState("")
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setAlumnoId(alumnoPreseleccionado?.id ?? "")
      setOcurrenciaId(ocurrencias.length === 1 ? ocurrencias[0].id : "")
      setCategoria("")
      setTitulo("")
      setError(null)
    }
  }, [open, alumnoPreseleccionado, ocurrencias])

  const mostrarManual = ocurrenciaId === "" || ocurrenciaId === OTRA_CLASE

  async function handleSubmit(evento: FormEvent) {
    evento.preventDefault()
    setError(null)

    if (!alumnoId) {
      setError("Selecciona un alumno.")
      return
    }

    setGuardando(true)

    try {
      const ocurrencia = ocurrencias.find((o) => o.id === ocurrenciaId)

      const { estado_plan } = ocurrencia
        ? await registrarAsistencia(
            alumnoId,
            {
              clase_tipo: "academia",
              clase_id: ocurrencia.id,
              titulo: ocurrencia.titulo,
              categoria: ocurrencia.categoria,
              fecha: ocurrencia.fecha,
              hora: ocurrencia.hora,
              academia_id: ocurrencia.academia_id,
            },
            "manual",
          )
        : await registrarAsistencia(
            alumnoId,
            {
              clase_tipo: "manual",
              titulo: titulo || "Registro manual",
              categoria: categoria || null,
              fecha: fechaHoy(),
              hora: horaAhora(),
            },
            "manual",
          )

      const alumno = alumnos.find((a) => a.id === alumnoId) ?? alumnoPreseleccionado
      const nombre = alumno?.nombre ?? "Alumno"
      const exito = ES_ESTADO_EXITOSO[estado_plan]

      onRegistrado(
        exito
          ? `${nombre}: se registró la clase exitosamente (${ETIQUETA_ESTADO_PLAN[estado_plan]})`
          : `${nombre}: ${ETIQUETA_ESTADO_PLAN[estado_plan]}`,
        exito,
      )
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar la asistencia.")
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar asistencia</DialogTitle>
          {ocurrencias.length > 1 && !alumnoPreseleccionado && (
            <DialogDescription>
              Hay varias clases hoy. Elige a cuál corresponde.
            </DialogDescription>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {!alumnoPreseleccionado && (
            <div className="flex flex-col gap-2">
              <Label>Alumno</Label>
              <Select value={alumnoId} onValueChange={setAlumnoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un alumno" />
                </SelectTrigger>
                <SelectContent>
                  {alumnos.map((alumno) => (
                    <SelectItem key={alumno.id} value={alumno.id}>
                      {alumno.nombre} · {alumno.documento}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {alumnoPreseleccionado && (
            <p className="rounded-control bg-surface-hover px-3 py-2 text-sm text-text">
              {alumnoPreseleccionado.nombre}{" "}
              <span className="text-text-muted">· {alumnoPreseleccionado.documento}</span>
            </p>
          )}

          {ocurrencias.length > 0 && (
            <div className="flex flex-col gap-2">
              <Label>Clase</Label>
              <Select value={ocurrenciaId} onValueChange={setOcurrenciaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona la clase" />
                </SelectTrigger>
                <SelectContent>
                  {ocurrencias.map((oc) => (
                    <SelectItem key={oc.id} value={oc.id}>
                      {oc.titulo} · {oc.hora}
                    </SelectItem>
                  ))}
                  <SelectItem value={OTRA_CLASE}>Otra (registro manual)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {mostrarManual && (
            <>
              <div className="flex flex-col gap-2">
                <Label htmlFor="titulo">Título</Label>
                <Input
                  id="titulo"
                  placeholder="Ej: Clase suelta, ensayo, evento..."
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="categoria">Categoría</Label>
                <Input
                  id="categoria"
                  placeholder="Ej: Salsa, Bachata..."
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                />
              </div>
            </>
          )}

          {error && (
            <p className="rounded-control bg-error/10 px-3 py-2 text-sm text-error">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={guardando}>
              {guardando ? "Registrando..." : "Registrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
