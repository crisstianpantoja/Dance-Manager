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
import { Textarea } from "@/components/ui/textarea"
import { supabase } from "@/lib/supabase"
import type { Academy } from "@/types/academy"
import type { Gig, GigEstado, GigTipo } from "@/types/gig"

interface GigFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  gig: Gig | null
  academias: Academy[]
  onSaved: () => void
}

const SIN_ACADEMIA = "sin-academia"

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

export function GigFormDialog({ open, onOpenChange, gig, academias, onSaved }: GigFormDialogProps) {
  const [tipo, setTipo] = useState<GigTipo>("dj")
  const [evento, setEvento] = useState("")
  const [lugar, setLugar] = useState("")
  const [fecha, setFecha] = useState(hoyISO())
  const [hora, setHora] = useState("18:00")
  const [duracionMin, setDuracionMin] = useState("60")
  const [pago, setPago] = useState("")
  const [estado, setEstado] = useState<GigEstado>("cotizado")
  const [contacto, setContacto] = useState("")
  const [notas, setNotas] = useState("")
  const [acompanado, setAcompanado] = useState(false)
  const [acompanante, setAcompanante] = useState("")
  const [pagoAcompanante, setPagoAcompanante] = useState("")
  const [academiaId, setAcademiaId] = useState<string>(SIN_ACADEMIA)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setTipo(gig?.tipo ?? "dj")
    setEvento(gig?.evento ?? "")
    setLugar(gig?.lugar ?? "")
    setFecha(gig?.fecha ?? hoyISO())
    setHora(gig?.hora?.slice(0, 5) ?? "18:00")
    setDuracionMin(gig?.duracion_min?.toString() ?? "60")
    setPago(gig?.pago?.toString() ?? "")
    setEstado(gig?.estado ?? "cotizado")
    setContacto(gig?.contacto ?? "")
    setNotas(gig?.notas ?? "")
    setAcompanado(gig?.acompanado ?? false)
    setAcompanante(gig?.acompanante ?? "")
    setPagoAcompanante(gig?.pago_acompanante?.toString() ?? "")
    setAcademiaId(gig?.academia_id ?? SIN_ACADEMIA)
    setError(null)
  }, [open, gig])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setGuardando(true)

    const datos = {
      tipo,
      evento,
      lugar: lugar || null,
      fecha,
      hora,
      duracion_min: Number(duracionMin) || 60,
      pago: Number(pago) || 0,
      estado,
      contacto: contacto || null,
      notas: notas || null,
      acompanado,
      acompanante: acompanado ? acompanante || null : null,
      pago_acompanante: acompanado && pagoAcompanante ? Number(pagoAcompanante) : null,
      academia_id: academiaId === SIN_ACADEMIA ? null : academiaId,
    }

    try {
      if (gig) {
        const { error } = await supabase.from("gigs").update(datos).eq("id", gig.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from("gigs").insert(datos)
        if (error) throw error
      }

      onSaved()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el contrato.")
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{gig ? "Editar contrato" : "Nuevo contrato"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="evento">Evento</Label>
            <Input id="evento" value={evento} onChange={(e) => setEvento(e.target.value)} required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as GigTipo)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dj">DJ</SelectItem>
                  <SelectItem value="tallerista">Tallerista</SelectItem>
                  <SelectItem value="contrato">Contrato</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Estado</Label>
              <Select value={estado} onValueChange={(v) => setEstado(v as GigEstado)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cotizado">Cotizado</SelectItem>
                  <SelectItem value="confirmado">Confirmado</SelectItem>
                  <SelectItem value="pagado">Pagado</SelectItem>
                </SelectContent>
              </Select>
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
            <div className="flex flex-col gap-2">
              <Label htmlFor="hora">Hora</Label>
              <Input id="hora" type="time" value={hora} onChange={(e) => setHora(e.target.value)} required />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="duracion">Duración (min)</Label>
              <Input
                id="duracion"
                type="number"
                min="15"
                step="15"
                value={duracionMin}
                onChange={(e) => setDuracionMin(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="pago">Pago (COP)</Label>
              <Input id="pago" type="number" min="0" value={pago} onChange={(e) => setPago(e.target.value)} required />
            </div>

            <div className="col-span-2 flex flex-col gap-2">
              <Label htmlFor="lugar">Lugar</Label>
              <Input id="lugar" value={lugar} onChange={(e) => setLugar(e.target.value)} />
            </div>

            <div className="col-span-2 flex flex-col gap-2">
              <Label htmlFor="contacto">Contacto</Label>
              <Input id="contacto" value={contacto} onChange={(e) => setContacto(e.target.value)} />
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

          <div className="flex items-center justify-between rounded-control border border-border px-4 py-3">
            <Label htmlFor="acompanado">Con acompañante</Label>
            <Switch id="acompanado" checked={acompanado} onCheckedChange={setAcompanado} />
          </div>

          {acompanado && (
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="acompanante">Acompañante</Label>
                <Input
                  id="acompanante"
                  value={acompanante}
                  onChange={(e) => setAcompanante(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="pagoAcompanante">Pago acompañante</Label>
                <Input
                  id="pagoAcompanante"
                  type="number"
                  min="0"
                  value={pagoAcompanante}
                  onChange={(e) => setPagoAcompanante(e.target.value)}
                />
              </div>
            </div>
          )}

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
