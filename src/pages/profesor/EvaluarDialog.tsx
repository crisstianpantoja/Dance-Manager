import { useEffect, useState, type FormEvent } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { registrarEvaluacion } from "@/lib/evaluations"
import type { Student } from "@/types/student"

interface EvaluarDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  alumno: Student
  onRegistrada: () => void
}

const COMPETENCIAS: { key: "ritmo" | "movimiento" | "imagen" | "conexion"; label: string }[] = [
  { key: "ritmo", label: "Ritmo" },
  { key: "movimiento", label: "Movimiento" },
  { key: "imagen", label: "Imagen" },
  { key: "conexion", label: "Conexión" },
]

export function EvaluarDialog({ open, onOpenChange, alumno, onRegistrada }: EvaluarDialogProps) {
  const [valores, setValores] = useState({ ritmo: 5, movimiento: 5, imagen: 5, conexion: 5 })
  const [nota, setNota] = useState("")
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setValores({ ritmo: 5, movimiento: 5, imagen: 5, conexion: 5 })
      setNota("")
      setError(null)
    }
  }, [open])

  async function handleSubmit(evento: FormEvent) {
    evento.preventDefault()
    setError(null)
    setGuardando(true)

    try {
      await registrarEvaluacion({
        alumno_id: alumno.id,
        ritmo: valores.ritmo,
        movimiento: valores.movimiento,
        imagen: valores.imagen,
        conexion: valores.conexion,
        nota,
      })
      onRegistrada()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar la evaluación.")
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Evaluar a {alumno.nombre}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {COMPETENCIAS.map(({ key, label }) => (
            <div key={key} className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor={key}>{label}</Label>
                <span className="text-sm font-medium text-text">{valores[key]}/10</span>
              </div>
              <input
                id={key}
                type="range"
                min={0}
                max={10}
                step={1}
                value={valores[key]}
                onChange={(e) =>
                  setValores((actual) => ({ ...actual, [key]: Number(e.target.value) }))
                }
                className="accent-brand"
              />
            </div>
          ))}

          <div className="flex flex-col gap-2">
            <Label htmlFor="nota">Nota para el alumno</Label>
            <Textarea
              id="nota"
              placeholder="Observaciones de la clase..."
              value={nota}
              onChange={(e) => setNota(e.target.value)}
            />
          </div>

          {error && (
            <p className="rounded-control bg-error/10 px-3 py-2 text-sm text-error">{error}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={guardando}>
              {guardando ? "Guardando..." : "Guardar evaluación"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
