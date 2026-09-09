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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatearFecha, formatearMoneda } from "@/lib/format"
import { subirComprobante } from "@/lib/storage"
import {
  anularLiquidacion,
  aprobarLiquidacion,
  listarItemsLiquidacion,
  marcarLiquidacionPagada,
  type ItemLiquidacion,
} from "@/lib/teacherLiquidations"
import type { EstadoLiquidacion, TeacherLiquidation } from "@/types/teacherLiquidation"

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

const METODOS_PAGO = ["Efectivo", "Transferencia", "Nequi", "Daviplata", "Otro"]

const ESTILO_ESTADO: Record<EstadoLiquidacion, "warning" | "muted" | "success" | "error"> = {
  pendiente: "warning",
  aprobada: "muted",
  pagada: "success",
  anulada: "error",
}

interface LiquidacionDetalleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  liquidacion: TeacherLiquidation | null
  profesorNombre: string
  onCambiada: () => void
}

export function LiquidacionDetalleDialog({
  open,
  onOpenChange,
  liquidacion,
  profesorNombre,
  onCambiada,
}: LiquidacionDetalleDialogProps) {
  const [items, setItems] = useState<ItemLiquidacion[]>([])
  const [cargando, setCargando] = useState(true)
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [mostrarPago, setMostrarPago] = useState(false)
  const [fechaPago, setFechaPago] = useState(new Date().toISOString().slice(0, 10))
  const [metodoPago, setMetodoPago] = useState(METODOS_PAGO[0])
  const [observaciones, setObservaciones] = useState("")
  const [comprobante, setComprobante] = useState<File | null>(null)

  useEffect(() => {
    if (!open || !liquidacion) return
    setError(null)
    setMostrarPago(false)
    setCargando(true)
    listarItemsLiquidacion(liquidacion.id)
      .then(setItems)
      .finally(() => setCargando(false))
  }, [open, liquidacion])

  async function accion(fn: () => Promise<void>) {
    setProcesando(true)
    setError(null)
    try {
      await fn()
      onCambiada()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo completar la acción.")
    } finally {
      setProcesando(false)
    }
  }

  async function handleMarcarPagada(e: FormEvent) {
    e.preventDefault()
    if (!liquidacion) return
    await accion(async () => {
      let comprobanteUrl: string | undefined
      if (comprobante) comprobanteUrl = await subirComprobante(comprobante, "liquidaciones")
      await marcarLiquidacionPagada(liquidacion.id, fechaPago, metodoPago, observaciones, comprobanteUrl)
    })
  }

  if (!liquidacion) return null

  const itemsActivos = items.filter((i) => !i.voided_at)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Liquidación de {profesorNombre} · {MESES[liquidacion.month - 1]} {liquidacion.year}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between rounded-control border border-border px-4 py-3">
            <div>
              <p className="text-xs text-text-muted">Total</p>
              <p className="text-xl font-bold text-text">{formatearMoneda(liquidacion.total_amount)}</p>
            </div>
            <Badge variant={ESTILO_ESTADO[liquidacion.estado]}>{liquidacion.estado}</Badge>
          </div>

          {liquidacion.estado === "pagada" && (
            <p className="text-xs text-text-muted">
              Pagada el {liquidacion.paid_at ? formatearFecha(liquidacion.paid_at) : "—"} ·{" "}
              {liquidacion.payment_method}
              {liquidacion.notes ? ` · ${liquidacion.notes}` : ""}
            </p>
          )}

          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-text">Clases incluidas</p>
            {cargando ? (
              <p className="text-sm text-text-muted">Cargando...</p>
            ) : itemsActivos.length === 0 ? (
              <p className="text-sm text-text-muted">Sin clases.</p>
            ) : (
              itemsActivos.map((item) => {
                const esAjuste = item.fecha_clase.slice(0, 7) !== `${liquidacion.year}-${String(liquidacion.month).padStart(2, "0")}`
                return (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <span className="text-text-muted">
                      {formatearFecha(item.fecha_clase)} · {item.titulo}
                      {esAjuste && <Badge variant="warning" className="ml-2">Ajuste</Badge>}
                    </span>
                    <span className="text-text">{formatearMoneda(item.amount)}</span>
                  </div>
                )
              })
            )}
          </div>

          {error && (
            <p className="rounded-control bg-error/10 px-3 py-2 text-sm text-error">{error}</p>
          )}

          {mostrarPago && liquidacion.estado !== "pagada" && (
            <form onSubmit={handleMarcarPagada} className="flex flex-col gap-3 border-t border-border pt-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="fechaPago">Fecha de pago</Label>
                  <Input
                    id="fechaPago"
                    type="date"
                    value={fechaPago}
                    onChange={(e) => setFechaPago(e.target.value)}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Método</Label>
                  <Select value={metodoPago} onValueChange={setMetodoPago}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {METODOS_PAGO.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="observaciones">Observaciones (opcional)</Label>
                <Input
                  id="observaciones"
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="comprobante">Comprobante (opcional)</Label>
                <input
                  id="comprobante"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setComprobante(e.target.files?.[0] ?? null)}
                  className="text-sm text-text-muted file:mr-3 file:rounded-control file:border-0 file:bg-surface-hover file:px-3 file:py-1.5 file:text-sm file:text-text"
                />
              </div>
              <Button type="submit" disabled={procesando}>
                {procesando ? "Guardando..." : "Confirmar pago"}
              </Button>
            </form>
          )}
        </div>

        <DialogFooter className="flex-wrap gap-2">
          {liquidacion.estado === "pendiente" && (
            <Button variant="outline" disabled={procesando} onClick={() => accion(() => aprobarLiquidacion(liquidacion.id))}>
              Aprobar
            </Button>
          )}
          {(liquidacion.estado === "pendiente" || liquidacion.estado === "aprobada") && !mostrarPago && (
            <Button disabled={procesando} onClick={() => setMostrarPago(true)}>
              Marcar como pagada
            </Button>
          )}
          {liquidacion.estado !== "pagada" && liquidacion.estado !== "anulada" && (
            <Button
              variant="outline"
              disabled={procesando}
              onClick={() => {
                if (confirm("¿Anular esta liquidación? Las clases quedarán disponibles para una liquidación futura."))
                  accion(() => anularLiquidacion(liquidacion.id))
              }}
            >
              Anular
            </Button>
          )}
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
