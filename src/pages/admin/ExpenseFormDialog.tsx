import { useEffect, useState, type FormEvent } from "react"

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
import { Textarea } from "@/components/ui/textarea"
import { supabase } from "@/lib/supabase"
import type { Academy } from "@/types/academy"
import type { Expense } from "@/types/expense"

interface ExpenseFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  gasto: Expense | null
  academias: Academy[]
  onSaved: () => void
}

const SIN_ACADEMIA = "sin-academia"

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

export function ExpenseFormDialog({
  open,
  onOpenChange,
  gasto,
  academias,
  onSaved,
}: ExpenseFormDialogProps) {
  const [concepto, setConcepto] = useState("")
  const [monto, setMonto] = useState("")
  const [fecha, setFecha] = useState(hoyISO())
  const [categoria, setCategoria] = useState("")
  const [notas, setNotas] = useState("")
  const [academiaId, setAcademiaId] = useState<string>(SIN_ACADEMIA)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setConcepto(gasto?.concepto ?? "")
    setMonto(gasto?.monto?.toString() ?? "")
    setFecha(gasto?.fecha ?? hoyISO())
    setCategoria(gasto?.categoria ?? "")
    setNotas(gasto?.notas ?? "")
    setAcademiaId(gasto?.academia_id ?? SIN_ACADEMIA)
    setError(null)
  }, [open, gasto])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setGuardando(true)

    const datos = {
      concepto,
      monto: Number(monto) || 0,
      fecha,
      categoria: categoria || null,
      notas: notas || null,
      academia_id: academiaId === SIN_ACADEMIA ? null : academiaId,
    }

    try {
      if (gasto) {
        const { error } = await supabase.from("expenses").update(datos).eq("id", gasto.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from("expenses").insert(datos)
        if (error) throw error
      }

      onSaved()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el gasto.")
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{gasto ? "Editar gasto" : "Nuevo gasto"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
              <Label htmlFor="fecha">Fecha</Label>
              <Input
                id="fecha"
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                required
              />
            </div>
            <div className="col-span-2 flex flex-col gap-2">
              <Label htmlFor="categoria">Categoría</Label>
              <Input
                id="categoria"
                placeholder="Arriendo, transporte, insumos..."
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
              />
            </div>
            <div className="col-span-2 flex flex-col gap-2">
              <Label>Sede</Label>
              <Select value={academiaId} onValueChange={setAcademiaId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SIN_ACADEMIA}>Sin sede</SelectItem>
                  {academias.map((academia) => (
                    <SelectItem key={academia.id} value={academia.id}>
                      {academia.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="notas">Notas</Label>
            <Textarea id="notas" value={notas} onChange={(e) => setNotas(e.target.value)} />
          </div>

          {error && (
            <p className="rounded-control bg-error/10 px-3 py-2 text-sm text-error">{error}</p>
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
