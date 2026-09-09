import { useEffect, useState, type FormEvent } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { crearAcuerdoProfesor, listarAcuerdosProfesor } from "@/lib/teacherAgreements"
import { formatearFecha, formatearMoneda } from "@/lib/format"
import type { Teacher } from "@/types/teacher"
import type { TeacherAgreement } from "@/types/teacherAgreement"

interface TeacherAgreementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  profesor: Teacher | null
}

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

export function TeacherAgreementDialog({
  open,
  onOpenChange,
  profesor,
}: TeacherAgreementDialogProps) {
  const [acuerdos, setAcuerdos] = useState<TeacherAgreement[]>([])
  const [cargando, setCargando] = useState(true)
  const [valor, setValor] = useState("")
  const [desde, setDesde] = useState(hoyISO())
  const [notas, setNotas] = useState("")
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function cargar() {
    if (!profesor) return
    setCargando(true)
    try {
      setAcuerdos(await listarAcuerdosProfesor(profesor.id))
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    if (open) {
      setValor("")
      setDesde(hoyISO())
      setNotas("")
      setError(null)
      cargar()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, profesor?.id])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!profesor) return
    setError(null)
    setGuardando(true)

    try {
      await crearAcuerdoProfesor(profesor.id, Number(valor), desde, notas || undefined)
      setValor("")
      setNotas("")
      await cargar()
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el acuerdo.")
    } finally {
      setGuardando(false)
    }
  }

  const vigente = acuerdos.find((a) => !a.effective_to)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Acuerdo económico{profesor ? ` · ${profesor.nombre}` : ""}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {vigente && (
            <div className="flex items-center justify-between rounded-control border border-brand/30 bg-brand/5 px-4 py-3">
              <div>
                <p className="text-xs text-text-muted">Tarifa vigente</p>
                <p className="text-lg font-bold text-text">
                  {formatearMoneda(vigente.amount_per_class)} / clase
                </p>
              </div>
              <Badge variant="success">Desde {formatearFecha(vigente.effective_from)}</Badge>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-3 border-t border-border pt-4">
            <p className="text-sm font-medium text-text">Definir nueva tarifa</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="valor">Valor por clase</Label>
                <Input
                  id="valor"
                  type="number"
                  min="0"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="desde">Vigente desde</Label>
                <Input
                  id="desde"
                  type="date"
                  value={desde}
                  onChange={(e) => setDesde(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="notas">Notas (opcional)</Label>
              <Input
                id="notas"
                placeholder="Ej: ajuste anual"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
              />
            </div>
            {error && (
              <p className="rounded-control bg-error/10 px-3 py-2 text-sm text-error">{error}</p>
            )}
            <Button type="submit" disabled={guardando} size="sm">
              {guardando ? "Guardando..." : "Guardar tarifa"}
            </Button>
            {vigente && (
              <p className="text-xs text-text-muted">
                Cierra automáticamente la tarifa anterior el día antes de esta fecha. Las clases
                ya confirmadas conservan su valor histórico.
              </p>
            )}
          </form>

          <div className="flex flex-col gap-2 border-t border-border pt-4">
            <p className="text-sm font-medium text-text">Histórico</p>
            {cargando ? (
              <p className="text-sm text-text-muted">Cargando...</p>
            ) : acuerdos.length === 0 ? (
              <p className="text-sm text-text-muted">Este profesor todavía no tiene tarifa configurada.</p>
            ) : (
              acuerdos.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between rounded-control border border-border px-3 py-2 text-sm"
                >
                  <span className="text-text">{formatearMoneda(a.amount_per_class)}</span>
                  <span className="text-text-muted">
                    {formatearFecha(a.effective_from)} –{" "}
                    {a.effective_to ? formatearFecha(a.effective_to) : "hoy"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
