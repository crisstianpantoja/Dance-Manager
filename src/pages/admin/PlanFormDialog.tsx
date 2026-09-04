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
import { Switch } from "@/components/ui/switch"
import { supabase } from "@/lib/supabase"
import { MODALIDADES, type ModalidadPlan, type Plan } from "@/types/plan"

interface PlanFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  plan: Plan | null
  onSaved: () => void
}

export function PlanFormDialog({ open, onOpenChange, plan, onSaved }: PlanFormDialogProps) {
  const [nombre, setNombre] = useState("")
  const [modalidad, setModalidad] = useState<ModalidadPlan>("cupos")
  const [clasesIncluidas, setClasesIncluidas] = useState("")
  const [diasVigencia, setDiasVigencia] = useState("")
  const [precio, setPrecio] = useState("")
  const [activo, setActivo] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setNombre(plan?.nombre ?? "")
      setModalidad(plan?.modalidad ?? "cupos")
      setClasesIncluidas(plan?.clases_incluidas?.toString() ?? "")
      setDiasVigencia(plan?.dias_vigencia?.toString() ?? "")
      setPrecio(plan?.precio?.toString() ?? "")
      setActivo(plan?.activo ?? true)
      setError(null)
    }
  }, [open, plan])

  async function handleSubmit(evento: FormEvent) {
    evento.preventDefault()
    setError(null)
    setGuardando(true)

    const datos = {
      nombre,
      modalidad,
      clases_incluidas: modalidad === "ilimitada" ? null : Number(clasesIncluidas) || 0,
      dias_vigencia: diasVigencia ? Number(diasVigencia) : null,
      precio: Number(precio) || 0,
      activo,
    }

    try {
      if (plan) {
        const { error } = await supabase.from("plans").update(datos).eq("id", plan.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from("plans").insert(datos)
        if (error) throw error
      }

      onSaved()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el plan.")
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{plan ? "Editar plan" : "Nuevo plan"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="nombre">Nombre</Label>
            <Input
              id="nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Modalidad</Label>
            <Select
              value={modalidad}
              onValueChange={(v) => setModalidad(v as ModalidadPlan)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODALIDADES.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {modalidad !== "ilimitada" && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="clases">Clases incluidas</Label>
                <Input
                  id="clases"
                  type="number"
                  min="1"
                  value={clasesIncluidas}
                  onChange={(e) => setClasesIncluidas(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="dias">Días de vigencia</Label>
              <Input
                id="dias"
                type="number"
                min="1"
                placeholder="Sin vencimiento"
                value={diasVigencia}
                onChange={(e) => setDiasVigencia(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="precio">Precio (COP)</Label>
            <Input
              id="precio"
              type="number"
              min="0"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              required
            />
          </div>

          <div className="flex items-center justify-between rounded-control border border-white/10 px-4 py-3">
            <Label htmlFor="activo">Plan activo</Label>
            <Switch id="activo" checked={activo} onCheckedChange={setActivo} />
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
