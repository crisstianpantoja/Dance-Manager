import { AlertCircle, CheckCircle2, Upload } from "lucide-react"
import { parse } from "papaparse"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { crearAlumno } from "@/lib/adminStudents"
import type { Academy } from "@/types/academy"
import type { NivelAlumno, TipoAlumno } from "@/types/student"

interface BulkImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  academias: Academy[]
  onImportado: () => void
}

interface FilaCSV {
  nombre?: string
  documento?: string
  contacto?: string
  tipo?: string
  nivel?: string
  academia?: string
}

interface ResultadoFila {
  fila: number
  nombre: string
  estado: "creado" | "error"
  detalle?: string
}

const NIVELES: NivelAlumno[] = ["Básica", "Intermedia", "Avanzada"]
const TIPOS: TipoAlumno[] = ["academia", "privada", "ambas"]

function normalizar(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase()
}

function resolverNivel(valor?: string): NivelAlumno | null {
  if (!valor) return null
  const buscado = normalizar(valor)
  return NIVELES.find((n) => normalizar(n) === buscado) ?? null
}

function resolverTipo(valor?: string): TipoAlumno | null {
  if (!valor) return null
  const buscado = normalizar(valor)
  return TIPOS.find((t) => normalizar(t) === buscado) ?? null
}

const PLANTILLA_CSV = `nombre,documento,contacto,tipo,nivel,academia
Juan Pérez,1020304050,3001234567,academia,Básica,
`

export function BulkImportDialog({
  open,
  onOpenChange,
  academias,
  onImportado,
}: BulkImportDialogProps) {
  const [archivo, setArchivo] = useState<File | null>(null)
  const [procesando, setProcesando] = useState(false)
  const [resultados, setResultados] = useState<ResultadoFila[] | null>(null)
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)

  function descargarPlantilla() {
    const blob = new Blob([PLANTILLA_CSV], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const enlace = document.createElement("a")
    enlace.href = url
    enlace.download = "plantilla-alumnos.csv"
    enlace.click()
    URL.revokeObjectURL(url)
  }

  function procesarArchivo() {
    if (!archivo) return
    setErrorGeneral(null)
    setResultados(null)
    setProcesando(true)

    parse<FilaCSV>(archivo, {
      header: true,
      skipEmptyLines: true,
      complete: async (resultado) => {
        const filas = resultado.data

        if (filas.length === 0) {
          setErrorGeneral("El archivo no tiene filas para importar.")
          setProcesando(false)
          return
        }

        const academiasPorNombre = new Map(academias.map((a) => [normalizar(a.nombre), a.id]))
        const resultadosFilas: ResultadoFila[] = []

        for (let i = 0; i < filas.length; i++) {
          const fila = filas[i]
          const numeroFila = i + 2 // +1 por índice base 0, +1 por la fila de encabezado
          const nombre = fila.nombre?.trim()
          const documento = fila.documento?.trim()

          if (!nombre || !documento) {
            resultadosFilas.push({
              fila: numeroFila,
              nombre: nombre || "(sin nombre)",
              estado: "error",
              detalle: "Faltan nombre o documento.",
            })
            continue
          }

          const tipo = resolverTipo(fila.tipo) ?? "academia"
          const nivel = resolverNivel(fila.nivel) ?? "Básica"
          const nombreAcademia = fila.academia?.trim()
          const academiaId = nombreAcademia
            ? (academiasPorNombre.get(normalizar(nombreAcademia)) ?? null)
            : null

          try {
            await crearAlumno({
              nombre,
              documento,
              contacto: fila.contacto?.trim() ?? "",
              foto: null,
              tipo,
              nivel,
              academia_id: academiaId,
            })
            resultadosFilas.push({
              fila: numeroFila,
              nombre,
              estado: "creado",
              detalle:
                nombreAcademia && !academiaId
                  ? `Academia "${nombreAcademia}" no encontrada, se dejó sin asignar.`
                  : undefined,
            })
          } catch (err) {
            resultadosFilas.push({
              fila: numeroFila,
              nombre,
              estado: "error",
              detalle: err instanceof Error ? err.message : "No se pudo crear.",
            })
          }
        }

        setResultados(resultadosFilas)
        setProcesando(false)
        onImportado()
      },
      error: (err: Error) => {
        setErrorGeneral(err.message)
        setProcesando(false)
      },
    })
  }

  function cerrar() {
    setArchivo(null)
    setResultados(null)
    setErrorGeneral(null)
    onOpenChange(false)
  }

  const creados = resultados?.filter((r) => r.estado === "creado").length ?? 0
  const conError = resultados?.filter((r) => r.estado === "error").length ?? 0

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? cerrar() : onOpenChange(o))}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Carga masiva de alumnos</DialogTitle>
        </DialogHeader>

        {!resultados ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-text-muted">
              Sube un archivo CSV con las columnas <code>nombre, documento, contacto, tipo,
              nivel, academia</code>. "Tipo" (academia/privada/ambas) y "academia" son
              opcionales; si los dejas vacíos se usa "academia" y "Básica".
            </p>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={descargarPlantilla}
              className="self-start"
            >
              Descargar plantilla CSV
            </Button>

            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
              className="text-sm text-text-muted file:mr-3 file:rounded-control file:border-0 file:bg-surface-hover file:px-3 file:py-1.5 file:text-sm file:text-text"
            />

            {errorGeneral && (
              <p className="rounded-control bg-error/10 px-3 py-2 text-sm text-error">
                {errorGeneral}
              </p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={cerrar}>
                Cancelar
              </Button>
              <Button type="button" onClick={procesarArchivo} disabled={!archivo || procesando}>
                <Upload className="size-4" />
                {procesando ? "Importando..." : "Importar"}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-text">
              <span className="text-success">{creados} creados</span>
              {conError > 0 && <span className="text-error">, {conError} con error</span>}
            </p>

            <div className="max-h-64 overflow-y-auto rounded-control border border-white/10">
              {resultados.map((r) => (
                <div
                  key={r.fila}
                  className="flex items-start gap-2 border-b border-white/5 px-3 py-2 text-sm last:border-0"
                >
                  {r.estado === "creado" ? (
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                  ) : (
                    <AlertCircle className="mt-0.5 size-4 shrink-0 text-error" />
                  )}
                  <div>
                    <p className="text-text">
                      Fila {r.fila}: {r.nombre}
                    </p>
                    {r.detalle && <p className="text-xs text-text-muted">{r.detalle}</p>}
                  </div>
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button type="button" onClick={cerrar}>
                Cerrar
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
