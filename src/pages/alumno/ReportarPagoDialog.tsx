import { useEffect, useMemo, useState, type FormEvent } from "react"

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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatearMoneda } from "@/lib/format"
import { reportarPago } from "@/lib/studentPortal"
import type { Plan } from "@/types/plan"

interface ReportarPagoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  planes: Plan[]
  onReportado: () => void
}

export function ReportarPagoDialog({ open, onOpenChange, planes, onReportado }: ReportarPagoDialogProps) {
  const [planId, setPlanId] = useState("")
  const [metodo, setMetodo] = useState("transferencia")
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const planesPrivados = useMemo(() => planes.filter((p) => p.modalidad === "paquete_privado"), [planes])
  const planesAcademia = useMemo(() => planes.filter((p) => p.modalidad !== "paquete_privado"), [planes])

  useEffect(() => {
    if (open) {
      setPlanId("")
      setMetodo("transferencia")
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

    setEnviando(true)

    try {
      await reportarPago(planId, metodo)
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
                {planesAcademia.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>Academia / mensualidad</SelectLabel>
                    {planesAcademia.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.nombre} · {formatearMoneda(plan.precio)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
                {planesPrivados.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>Clases privadas</SelectLabel>
                    {planesPrivados.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.nombre} · {formatearMoneda(plan.precio)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
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
