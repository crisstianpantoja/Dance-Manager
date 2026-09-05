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
import { Textarea } from "@/components/ui/textarea"
import { supabase } from "@/lib/supabase"
import type { EventoDM } from "@/types/event"

interface EventFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  evento: EventoDM | null
  onSaved: () => void
}

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

export function EventFormDialog({ open, onOpenChange, evento, onSaved }: EventFormDialogProps) {
  const [titulo, setTitulo] = useState("")
  const [fecha, setFecha] = useState(hoyISO())
  const [hora, setHora] = useState("18:00")
  const [lugar, setLugar] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [cupoMaximo, setCupoMaximo] = useState("")
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setTitulo(evento?.titulo ?? "")
    setFecha(evento?.fecha ?? hoyISO())
    setHora(evento?.hora?.slice(0, 5) ?? "18:00")
    setLugar(evento?.lugar ?? "")
    setDescripcion(evento?.descripcion ?? "")
    setCupoMaximo(evento?.cupo_maximo?.toString() ?? "")
    setError(null)
  }, [open, evento])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setGuardando(true)

    const datos = {
      titulo,
      fecha,
      hora,
      lugar: lugar || null,
      descripcion: descripcion || null,
      cupo_maximo: cupoMaximo ? Number(cupoMaximo) : null,
    }

    try {
      if (evento) {
        const { error } = await supabase.from("events").update(datos).eq("id", evento.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from("events").insert({ ...datos, reservas: [] })
        if (error) throw error
      }

      onSaved()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el evento.")
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{evento ? "Editar evento" : "Nuevo evento"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="titulo">Título</Label>
            <Input id="titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} required />
          </div>

          <div className="grid grid-cols-2 gap-4">
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
            <div className="flex flex-col gap-2">
              <Label htmlFor="hora">Hora</Label>
              <Input id="hora" type="time" value={hora} onChange={(e) => setHora(e.target.value)} required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="lugar">Lugar</Label>
              <Input id="lugar" value={lugar} onChange={(e) => setLugar(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="cupo">Cupo máximo</Label>
              <Input
                id="cupo"
                type="number"
                min="1"
                placeholder="Sin límite"
                value={cupoMaximo}
                onChange={(e) => setCupoMaximo(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea
              id="descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
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
