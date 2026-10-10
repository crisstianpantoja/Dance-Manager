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
import { useAuth } from "@/context/AuthContext"
import { formatearMoneda } from "@/lib/format"
import { subirComprobante } from "@/lib/storage"
import { reportarPago } from "@/lib/studentPortal"
import { mensajeDeError } from "@/lib/errors"
import type { Plan } from "@/types/plan"

interface ReportarPagoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  planes: Plan[]
  onReportado: () => void
}

export function ReportarPagoDialog({ open, onOpenChange, planes, onReportado }: ReportarPagoDialogProps) {
  const { profile } = useAuth()
  const [planId, setPlanId] = useState("")
  const [metodo, setMetodo] = useState("transferencia")
  const [archivoComprobante, setArchivoComprobante] = useState<File | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const planesPrivados = useMemo(() => planes.filter((p) => p.modalidad === "paquete_privado"), [planes])
  const planesAcademia = useMemo(() => planes.filter((p) => p.modalidad !== "paquete_privado"), [planes])

  useEffect(() => {
    if (open) {
      setPlanId("")
      setMetodo("transferencia")
      setArchivoComprobante(null)
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
      let comprobanteUrl: string | null = null
      if (archivoComprobante && profile?.id) {
        comprobanteUrl = await subirComprobante(archivoComprobante, profile.id)
      }

      await reportarPago(planId, metodo, comprobanteUrl)
      onReportado()
      onOpenChange(false)
    } catch (err) {
      setError(mensajeDeError(err, "No se pudo reportar el pago."))
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

          <div className="flex flex-col gap-2">
            <Label htmlFor="comprobante">Comprobante (opcional)</Label>
            <input
              id="comprobante"
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setArchivoComprobante(e.target.files?.[0] ?? null)}
              className="w-full max-w-full text-sm text-text-muted file:mr-3 file:rounded-control file:border-0 file:bg-surface-hover file:px-3 file:py-1.5 file:text-sm file:text-text"
            />
            <p className="text-xs text-text-muted">
              Si subes la foto de la transferencia, se verifica más rápido.
            </p>
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
