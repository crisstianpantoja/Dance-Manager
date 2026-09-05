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
import { generarOcurrencias } from "@/lib/occurrences"
import { supabase } from "@/lib/supabase"
import type { Academy } from "@/types/academy"
import { DIAS_SEMANA, type ClassSeries } from "@/types/classSeries"

const SIN_ACADEMIA = "sin-academia"

interface ClassSeriesFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  serie: ClassSeries | null
  academias: Academy[]
  onSaved: () => void
}

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

export function ClassSeriesFormDialog({
  open,
  onOpenChange,
  serie,
  academias,
  onSaved,
}: ClassSeriesFormDialogProps) {
  const [titulo, setTitulo] = useState("")
  const [categoria, setCategoria] = useState("")
  const [academiaId, setAcademiaId] = useState(SIN_ACADEMIA)
  const [diaSemana, setDiaSemana] = useState("1")
  const [hora, setHora] = useState("18:00")
  const [duracionMin, setDuracionMin] = useState("60")
  const [cupoMaximo, setCupoMaximo] = useState("")
  const [lugar, setLugar] = useState("")
  const [vigenteDesde, setVigenteDesde] = useState(hoyISO())
  const [vigenteHasta, setVigenteHasta] = useState("")
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return

    setTitulo(serie?.titulo ?? "")
    setCategoria(serie?.categoria ?? "")
    setAcademiaId(serie?.academia_id ?? SIN_ACADEMIA)
    setDiaSemana(serie?.dia_semana?.toString() ?? "1")
    setHora(serie?.hora?.slice(0, 5) ?? "18:00")
    setDuracionMin(serie?.duracion_min?.toString() ?? "60")
    setCupoMaximo(serie?.cupo_maximo?.toString() ?? "")
    setLugar(serie?.lugar ?? "")
    setVigenteDesde(serie?.vigente_desde ?? hoyISO())
    setVigenteHasta(serie?.vigente_hasta ?? "")
    setError(null)
  }, [open, serie])

  async function handleSubmit(evento: FormEvent) {
    evento.preventDefault()
    setError(null)
    setGuardando(true)

    const datos = {
      titulo,
      categoria: categoria || null,
      academia_id: academiaId === SIN_ACADEMIA ? null : academiaId,
      dia_semana: Number(diaSemana),
      hora,
      duracion_min: Number(duracionMin) || 60,
      cupo_maximo: cupoMaximo ? Number(cupoMaximo) : null,
      lugar: lugar || null,
      vigente_desde: vigenteDesde,
      vigente_hasta: vigenteHasta || null,
    }

    try {
      let serieGuardada: ClassSeries

      if (serie) {
        const { data, error } = await supabase
          .from("class_series")
          .update(datos)
          .eq("id", serie.id)
          .select()
          .single()
        if (error) throw error
        serieGuardada = data as ClassSeries
      } else {
        const { data, error } = await supabase
          .from("class_series")
          .insert({ ...datos, profesor_ids: [] })
          .select()
          .single()
        if (error) throw error
        serieGuardada = data as ClassSeries
      }

      await generarOcurrencias(serieGuardada)

      onSaved()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la clase.")
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{serie ? "Editar clase" : "Nueva clase recurrente"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="titulo">Título</Label>
            <Input
              id="titulo"
              placeholder="Ej: Salsa Nivel 2"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="categoria">Categoría</Label>
              <Input
                id="categoria"
                placeholder="Salsa, Bachata..."
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Academia</Label>
              <Select value={academiaId} onValueChange={setAcademiaId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SIN_ACADEMIA}>Sin academia</SelectItem>
                  {academias.map((academia) => (
                    <SelectItem key={academia.id} value={academia.id}>
                      {academia.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Día</Label>
              <Select value={diaSemana} onValueChange={setDiaSemana}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DIAS_SEMANA.map((dia, indice) => (
                    <SelectItem key={dia} value={indice.toString()}>
                      {dia}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="hora">Hora</Label>
              <Input
                id="hora"
                type="time"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
                required
              />
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

            <div className="col-span-2 flex flex-col gap-2">
              <Label htmlFor="lugar">Lugar</Label>
              <Input
                id="lugar"
                placeholder="Salón principal..."
                value={lugar}
                onChange={(e) => setLugar(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="desde">Vigente desde</Label>
              <Input
                id="desde"
                type="date"
                value={vigenteDesde}
                onChange={(e) => setVigenteDesde(e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="hasta">Vigente hasta</Label>
              <Input
                id="hasta"
                type="date"
                placeholder="Indefinido"
                value={vigenteHasta}
                onChange={(e) => setVigenteHasta(e.target.value)}
              />
            </div>
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
