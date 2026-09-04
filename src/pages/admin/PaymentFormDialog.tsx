import { useEffect, useMemo, useState, type FormEvent } from "react"

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
import { obtenerUrlComprobante, subirComprobante } from "@/lib/storage"
import { supabase } from "@/lib/supabase"
import type { EstadoPago, Payment } from "@/types/payment"
import type { ModalidadPlan, Plan } from "@/types/plan"
import type { Student } from "@/types/student"

interface PaymentFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pago: Payment | null
  alumnoFijo: Student | null
  alumnos: Student[]
  planes: Plan[]
  onSaved: () => void
}

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

function sumarDias(fechaISO: string, dias: number) {
  const fecha = new Date(`${fechaISO}T00:00:00`)
  fecha.setDate(fecha.getDate() + dias)
  return fecha.toISOString().slice(0, 10)
}

export function PaymentFormDialog({
  open,
  onOpenChange,
  pago,
  alumnoFijo,
  alumnos,
  planes,
  onSaved,
}: PaymentFormDialogProps) {
  const [alumnoId, setAlumnoId] = useState("")
  const [planId, setPlanId] = useState<string>("")
  const [modalidad, setModalidad] = useState<ModalidadPlan>("cupos")
  const [concepto, setConcepto] = useState("")
  const [clasesIncluidas, setClasesIncluidas] = useState("")
  const [fecha, setFecha] = useState(hoyISO())
  const [fechaVencimiento, setFechaVencimiento] = useState("")
  const [monto, setMonto] = useState("")
  const [metodo, setMetodo] = useState("efectivo")
  const [estado, setEstado] = useState<EstadoPago>("pagado")
  const [comprobante, setComprobante] = useState<string | null>(null)
  const [archivoComprobante, setArchivoComprobante] = useState<File | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const planesActivos = useMemo(
    () => planes.filter((p) => p.activo || p.id === planId),
    [planes, planId],
  )

  useEffect(() => {
    if (!open) return

    setAlumnoId(pago?.alumno_id ?? alumnoFijo?.id ?? "")
    setPlanId(pago?.plan_id ?? "")
    setModalidad(pago?.modalidad ?? "cupos")
    setConcepto(pago?.concepto ?? "")
    setClasesIncluidas(pago?.clases_incluidas?.toString() ?? "")
    setFecha(pago?.fecha ?? hoyISO())
    setFechaVencimiento(pago?.fecha_vencimiento ?? "")
    setMonto(pago?.monto?.toString() ?? "")
    setMetodo(pago?.metodo ?? "efectivo")
    setEstado(pago?.estado ?? "pagado")
    setComprobante(pago?.comprobante_url ?? null)
    setArchivoComprobante(null)
    setError(null)
  }, [open, pago, alumnoFijo])

  function aplicarPlan(id: string) {
    setPlanId(id)
    const plan = planes.find((p) => p.id === id)
    if (!plan) return

    setModalidad(plan.modalidad)
    setConcepto(plan.nombre)
    setClasesIncluidas(plan.clases_incluidas?.toString() ?? "0")
    setMonto(plan.precio.toString())
    setFechaVencimiento(plan.dias_vigencia ? sumarDias(fecha, plan.dias_vigencia) : "")
  }

  async function handleSubmit(evento: FormEvent) {
    evento.preventDefault()
    setError(null)

    if (!alumnoId) {
      setError("Selecciona un alumno.")
      return
    }

    setGuardando(true)

    try {
      let comprobanteUrl = comprobante

      if (archivoComprobante) {
        comprobanteUrl = await subirComprobante(archivoComprobante, alumnoId)
      }

      const datos = {
        alumno_id: alumnoId,
        plan_id: planId || null,
        modalidad,
        concepto,
        clases_incluidas: modalidad === "ilimitada" ? 0 : Number(clasesIncluidas) || 0,
        fecha,
        fecha_vencimiento: fechaVencimiento || null,
        monto: Number(monto) || 0,
        estado,
        metodo,
        comprobante_url: comprobanteUrl,
      }

      if (pago) {
        const { error } = await supabase.from("payments").update(datos).eq("id", pago.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from("payments")
          .insert({ ...datos, clases_usadas: 0 })
        if (error) throw error
      }

      onSaved()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el pago.")
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{pago ? "Editar pago" : "Registrar pago / asignar plan"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {!alumnoFijo && (
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

          <div className="flex flex-col gap-2">
            <Label>Plan del catálogo</Label>
            <Select value={planId} onValueChange={aplicarPlan}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un plan (opcional)" />
              </SelectTrigger>
              <SelectContent>
                {planesActivos.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    {plan.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="concepto">Concepto</Label>
            <Input
              id="concepto"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {modalidad !== "ilimitada" && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="clasesIncluidas">Clases incluidas</Label>
                <Input
                  id="clasesIncluidas"
                  type="number"
                  min="0"
                  value={clasesIncluidas}
                  onChange={(e) => setClasesIncluidas(e.target.value)}
                />
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="monto">Monto (COP)</Label>
              <Input
                id="monto"
                type="number"
                min="0"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="fecha">Fecha de compra</Label>
              <Input
                id="fecha"
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="fechaVencimiento">Vence</Label>
              <Input
                id="fechaVencimiento"
                type="date"
                value={fechaVencimiento}
                onChange={(e) => setFechaVencimiento(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Método</Label>
              <Select value={metodo} onValueChange={setMetodo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                  <SelectItem value="tarjeta">Tarjeta</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Estado</Label>
              <Select value={estado} onValueChange={(v) => setEstado(v as EstadoPago)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="pagado">Pagado</SelectItem>
                  <SelectItem value="rechazado">Rechazado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="comprobante">Comprobante</Label>
            {comprobante && !archivoComprobante && (
              <button
                type="button"
                onClick={async () => {
                  try {
                    const url = await obtenerUrlComprobante(comprobante)
                    window.open(url, "_blank", "noreferrer")
                  } catch {
                    alert("No se pudo abrir el comprobante.")
                  }
                }}
                className="self-start text-sm text-brand-light underline-offset-4 hover:underline"
              >
                Ver comprobante actual
              </button>
            )}
            <input
              id="comprobante"
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setArchivoComprobante(e.target.files?.[0] ?? null)}
              className="text-sm text-text-muted file:mr-3 file:rounded-control file:border-0 file:bg-surface-hover file:px-3 file:py-1.5 file:text-sm file:text-text"
            />
          </div>

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
              {guardando ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
