import { Check, FileText, Pencil, Plus, X } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { PaymentFormDialog } from "@/pages/admin/PaymentFormDialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatearFecha, formatearMoneda } from "@/lib/format"
import { obtenerUrlComprobante } from "@/lib/storage"
import { supabase } from "@/lib/supabase"
import type { EstadoPago, Payment } from "@/types/payment"
import type { Plan } from "@/types/plan"
import type { Student } from "@/types/student"

const ESTILO_ESTADO: Record<EstadoPago, "success" | "warning" | "error"> = {
  pagado: "success",
  pendiente: "warning",
  rechazado: "error",
}

const ETIQUETA_ESTADO: Record<EstadoPago, string> = {
  pagado: "Pagado",
  pendiente: "Pendiente",
  rechazado: "Rechazado",
}

const ETIQUETA_METODO: Record<string, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  tarjeta: "Tarjeta",
}

function etiquetaMetodo(metodo: string | null) {
  if (!metodo) return "—"
  return ETIQUETA_METODO[metodo] ?? metodo
}

export function PaymentsPage() {
  const [pagos, setPagos] = useState<Payment[]>([])
  const [alumnos, setAlumnos] = useState<Student[]>([])
  const [planes, setPlanes] = useState<Plan[]>([])
  const [cargando, setCargando] = useState(true)
  const [dialogoAbierto, setDialogoAbierto] = useState(false)
  const [pagoEditando, setPagoEditando] = useState<Payment | null>(null)
  const [actualizando, setActualizando] = useState<string | null>(null)

  const alumnosPorId = useMemo(
    () => new Map(alumnos.map((alumno) => [alumno.id, alumno])),
    [alumnos],
  )

  async function cargarDatos() {
    setCargando(true)
    const [{ data: pagosData }, { data: alumnosData }, { data: planesData }] =
      await Promise.all([
        supabase.from("payments").select("*").order("fecha", { ascending: false }),
        supabase.from("students").select("*").order("nombre"),
        supabase.from("plans").select("*").order("nombre"),
      ])
    setPagos((pagosData as Payment[]) ?? [])
    setAlumnos((alumnosData as Student[]) ?? [])
    setPlanes((planesData as Plan[]) ?? [])
    setCargando(false)
  }

  useEffect(() => {
    cargarDatos()
  }, [])

  function abrirCrear() {
    setPagoEditando(null)
    setDialogoAbierto(true)
  }

  function abrirEditar(pago: Payment) {
    setPagoEditando(pago)
    setDialogoAbierto(true)
  }

  async function cambiarEstado(pago: Payment, estado: EstadoPago) {
    setActualizando(pago.id)
    const { error } = await supabase
      .from("payments")
      .update({ estado })
      .eq("id", pago.id)
    setActualizando(null)

    if (error) {
      alert("No se pudo actualizar el estado del pago.")
      return
    }

    cargarDatos()
  }

  async function verComprobante(pago: Payment) {
    if (!pago.comprobante_url) return
    try {
      const url = await obtenerUrlComprobante(pago.comprobante_url)
      window.open(url, "_blank", "noreferrer")
    } catch {
      alert("No se pudo abrir el comprobante.")
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text">Pagos</h1>
        <Button onClick={abrirCrear} size="sm">
          <Plus className="size-4" />
          Registrar pago
        </Button>
      </div>

      {cargando ? (
        <p className="text-sm text-text-muted">Cargando...</p>
      ) : pagos.length === 0 ? (
        <p className="text-sm text-text-muted">Aún no hay pagos registrados.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Alumno</TableHead>
              <TableHead>Concepto</TableHead>
              <TableHead>Monto</TableHead>
              <TableHead>Método</TableHead>
              <TableHead>Vence</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-32 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagos.map((pago) => {
              const alumno = alumnosPorId.get(pago.alumno_id)
              return (
                <TableRow key={pago.id}>
                  <TableCell>
                    <p className="font-medium text-text">{alumno?.nombre ?? "—"}</p>
                    <p className="text-xs text-text-muted">{alumno?.documento}</p>
                  </TableCell>
                  <TableCell className="text-text-muted">
                    <div className="flex items-center gap-2">
                      {pago.concepto}
                      {pago.comprobante_url && (
                        <button
                          onClick={() => verComprobante(pago)}
                          title="Ver comprobante"
                          className="text-text-muted transition-colors hover:text-brand-light"
                        >
                          <FileText className="size-4" />
                        </button>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-text">{formatearMoneda(pago.monto)}</TableCell>
                  <TableCell className="text-text-muted">{etiquetaMetodo(pago.metodo)}</TableCell>
                  <TableCell className="text-text-muted">
                    {formatearFecha(pago.fecha_vencimiento)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={ESTILO_ESTADO[pago.estado]}>
                      {ETIQUETA_ESTADO[pago.estado]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      {pago.estado === "pendiente" && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={actualizando === pago.id}
                            onClick={() => cambiarEstado(pago, "pagado")}
                            title="Verificar"
                          >
                            <Check className="size-4 text-success" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={actualizando === pago.id}
                            onClick={() => cambiarEstado(pago, "rechazado")}
                            title="Rechazar"
                          >
                            <X className="size-4 text-error" />
                          </Button>
                        </>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => abrirEditar(pago)}>
                        <Pencil className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}

      <PaymentFormDialog
        open={dialogoAbierto}
        onOpenChange={setDialogoAbierto}
        pago={pagoEditando}
        alumnoFijo={null}
        alumnos={alumnos}
        planes={planes}
        onSaved={cargarDatos}
      />
    </div>
  )
}
