import { Pencil, Plus, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"

import { ExpenseFormDialog } from "@/pages/admin/ExpenseFormDialog"
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
import { supabase } from "@/lib/supabase"
import type { Expense } from "@/types/expense"

export function GastosPage() {
  const [gastos, setGastos] = useState<Expense[]>([])
  const [cargando, setCargando] = useState(true)
  const [dialogoAbierto, setDialogoAbierto] = useState(false)
  const [gastoEditando, setGastoEditando] = useState<Expense | null>(null)

  async function cargar() {
    setCargando(true)
    const { data } = await supabase.from("expenses").select("*").order("fecha", { ascending: false })
    setGastos((data as Expense[]) ?? [])
    setCargando(false)
  }

  useEffect(() => {
    cargar()
  }, [])

  function abrirCrear() {
    setGastoEditando(null)
    setDialogoAbierto(true)
  }

  function abrirEditar(gasto: Expense) {
    setGastoEditando(gasto)
    setDialogoAbierto(true)
  }

  async function eliminar(gasto: Expense) {
    if (!confirm(`¿Eliminar el gasto "${gasto.concepto}"?`)) return
    const { error } = await supabase.from("expenses").delete().eq("id", gasto.id)
    if (error) {
      alert("No se pudo eliminar el gasto.")
      return
    }
    cargar()
  }

  const totalMes = gastos
    .filter((g) => g.fecha.slice(0, 7) === new Date().toISOString().slice(0, 7))
    .reduce((acc, g) => acc + Number(g.monto), 0)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">Gastos</h1>
          <p className="text-sm text-text-muted">Este mes: {formatearMoneda(totalMes)}</p>
        </div>
        <Button onClick={abrirCrear} size="sm">
          <Plus className="size-4" />
          Nuevo gasto
        </Button>
      </div>

      {cargando ? (
        <p className="text-sm text-text-muted">Cargando...</p>
      ) : gastos.length === 0 ? (
        <p className="text-sm text-text-muted">Aún no hay gastos registrados.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Concepto</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Monto</TableHead>
              <TableHead className="w-24 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {gastos.map((gasto) => (
              <TableRow key={gasto.id}>
                <TableCell className="font-medium text-text">{gasto.concepto}</TableCell>
                <TableCell className="text-text-muted">{gasto.categoria ?? "—"}</TableCell>
                <TableCell className="text-text-muted">{formatearFecha(gasto.fecha)}</TableCell>
                <TableCell className="text-error">{formatearMoneda(gasto.monto)}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => abrirEditar(gasto)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => eliminar(gasto)}>
                      <Trash2 className="size-4 text-error" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <ExpenseFormDialog
        open={dialogoAbierto}
        onOpenChange={setDialogoAbierto}
        gasto={gastoEditando}
        onSaved={cargar}
      />
    </div>
  )
}
