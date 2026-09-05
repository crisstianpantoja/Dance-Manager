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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatearMoneda } from "@/lib/format"
import { reportarPago } from "@/lib/studentPortal"
import { subirComprobante } from "@/lib/storage"
import type { Plan } from "@/types/plan"

interface ReportarPagoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  alumnoId: string
  planes: Plan[]
  onReportado: () => void
}

export function ReportarPagoDialog({
  open,
  onOpenChange,
  alumnoId,
  planes,
  onReportado,
}: ReportarPagoDialogProps) {
  const [planId, setPlanId] = useState("")
  const [metodo, setMetodo] = useState("transferencia")
  const [archivo, setArchivo] = useState<File | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setPlanId("")
      setMetodo("transferencia")
      setArchivo(null)
      setError(null)
    }
  }, [open])

  async function handleSubmit(evento: FormEvent) {
    evento.preventDefault()
    setError(null)

    if (!planId) {
      setError("Selecciona el plan que vas a pagar.")
      return
    }
    if (!archivo) {
      setError("Adjunta el comprobante de pago.")
      return
    }

    setEnviando(true)

    try {
      const ruta = await subirComprobante(archivo, alumnoId)
      await reportarPago(planId, ruta, metodo)
      onReportado()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo reportar el pago.")
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reportar pago</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Plan</Label>
            <Select value={planId} onValueChange={setPlanId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un plan" />
              </SelectTrigger>
              <SelectContent>
                {planes.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    {plan.nombre} · {formatearMoneda(plan.precio)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Método de pago</Label>
            <Select value={metodo} onValueChange={setMetodo}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="transferencia">Transferencia</SelectItem>
                <SelectItem value="efectivo">Efectivo</SelectItem>
                <SelectItem value="tarjeta">Tarjeta</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="comprobante">Comprobante</Label>
            <input
              id="comprobante"
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
              className="text-sm text-text-muted file:mr-3 file:rounded-control file:border-0 file:bg-surface-hover file:px-3 file:py-1.5 file:text-sm file:text-text"
            />
          </div>

          <p className="text-xs text-text-muted">
            Tu pago quedará "pendiente" hasta que el administrador lo verifique.
          </p>

          {error && (
            <p className="rounded-control bg-error/10 px-3 py-2 text-sm text-error">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={enviando}>
              {enviando ? "Enviando..." : "Reportar pago"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
