import { Pencil, Plus, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"

import { PlanFormDialog } from "@/pages/admin/PlanFormDialog"
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
import { formatearMoneda } from "@/lib/format"
import { supabase } from "@/lib/supabase"
import { MODALIDADES, type Plan } from "@/types/plan"

const ETIQUETA_MODALIDAD = Object.fromEntries(MODALIDADES.map((m) => [m.value, m.label]))

export function PlansPage() {
  const [planes, setPlanes] = useState<Plan[]>([])
  const [cargando, setCargando] = useState(true)
  const [dialogoAbierto, setDialogoAbierto] = useState(false)
  const [planEditando, setPlanEditando] = useState<Plan | null>(null)
  const [eliminando, setEliminando] = useState<string | null>(null)

  async function cargarPlanes() {
    setCargando(true)
    const { data } = await supabase
      .from("plans")
      .select("*")
      .order("activo", { ascending: false })
      .order("nombre")
    setPlanes((data as Plan[]) ?? [])
    setCargando(false)
  }

  useEffect(() => {
    cargarPlanes()
  }, [])

  function abrirCrear() {
    setPlanEditando(null)
    setDialogoAbierto(true)
  }

  function abrirEditar(plan: Plan) {
    setPlanEditando(plan)
    setDialogoAbierto(true)
  }

  async function eliminarPlan(plan: Plan) {
    if (!confirm(`¿Eliminar el plan "${plan.nombre}"?`)) return

    setEliminando(plan.id)
    const { error } = await supabase.from("plans").delete().eq("id", plan.id)
    setEliminando(null)

    if (error) {
      alert(
        "No se pudo eliminar el plan. Si ya tiene pagos asociados, desactívalo en vez de borrarlo.",
      )
      return
    }

    cargarPlanes()
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text">Catálogo de planes</h1>
        <Button onClick={abrirCrear} size="sm">
          <Plus className="size-4" />
          Nuevo plan
        </Button>
      </div>

      {cargando ? (
        <p className="text-sm text-text-muted">Cargando...</p>
      ) : planes.length === 0 ? (
        <p className="text-sm text-text-muted">Aún no hay planes en el catálogo.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plan</TableHead>
              <TableHead>Modalidad</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead className="w-24 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {planes.map((plan) => (
              <TableRow key={plan.id} className={plan.activo ? "" : "opacity-50"}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-text">{plan.nombre}</span>
                    {!plan.activo && <Badge variant="muted">Inactivo</Badge>}
                  </div>
                  <p className="text-xs text-text-muted">
                    {plan.modalidad === "ilimitada"
                      ? "Sin límite de clases"
                      : `${plan.clases_incluidas ?? 0} clases`}
                    {plan.dias_vigencia ? ` · ${plan.dias_vigencia} días` : ""}
                  </p>
                </TableCell>
                <TableCell className="text-text-muted">
                  {ETIQUETA_MODALIDAD[plan.modalidad]}
                </TableCell>
                <TableCell className="text-text">{formatearMoneda(plan.precio)}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => abrirEditar(plan)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={eliminando === plan.id}
                      onClick={() => eliminarPlan(plan)}
                    >
                      <Trash2 className="size-4 text-error" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <PlanFormDialog
        open={dialogoAbierto}
        onOpenChange={setDialogoAbierto}
        plan={planEditando}
        onSaved={cargarPlanes}
      />
    </div>
  )
}
