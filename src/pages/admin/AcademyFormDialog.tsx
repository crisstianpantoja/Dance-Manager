import { useEffect, useState, type FormEvent } from "react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
import { subirFoto } from "@/lib/storage"
import { supabase } from "@/lib/supabase"
import type { Academy } from "@/types/academy"

const COLOR_POR_DEFECTO = "#9542DF"

interface AcademyFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  academia: Academy | null
  onSaved: () => void
}

export function AcademyFormDialog({
  open,
  onOpenChange,
  academia,
  onSaved,
}: AcademyFormDialogProps) {
  const [nombre, setNombre] = useState("")
  const [color, setColor] = useState(COLOR_POR_DEFECTO)
  const [logo, setLogo] = useState<string | null>(null)
  const [archivoLogo, setArchivoLogo] = useState<File | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setNombre(academia?.nombre ?? "")
      setColor(academia?.color ?? COLOR_POR_DEFECTO)
      setLogo(academia?.logo ?? null)
      setArchivoLogo(null)
      setError(null)
    }
  }, [open, academia])

  async function handleSubmit(evento: FormEvent) {
    evento.preventDefault()
    setError(null)
    setGuardando(true)

    try {
      let logoUrl = logo

      if (archivoLogo) {
        logoUrl = await subirFoto(archivoLogo, "academias")
      }

      if (academia) {
        const { error } = await supabase
          .from("academies")
          .update({ nombre, color, logo: logoUrl })
          .eq("id", academia.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from("academies")
          .insert({ nombre, color, logo: logoUrl })

        if (error) throw error
      }

      onSaved()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la sede.")
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{academia ? "Editar sede" : "Nueva sede"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="size-16 rounded-control">
              <AvatarImage src={logo ?? undefined} alt={nombre} />
              <AvatarFallback className="rounded-control">
                {nombre.slice(0, 2).toUpperCase() || "DM"}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-1">
              <Label htmlFor="logo">Logo</Label>
              <input
                id="logo"
                type="file"
                accept="image/*"
                onChange={(e) => setArchivoLogo(e.target.files?.[0] ?? null)}
                className="text-sm text-text-muted file:mr-3 file:rounded-control file:border-0 file:bg-surface-hover file:px-3 file:py-1.5 file:text-sm file:text-text"
              />
            </div>
          </div>

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
            <Label htmlFor="color">Color de marca</Label>
            <div className="flex items-center gap-3">
              <input
                id="color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-11 w-14 cursor-pointer rounded-control border border-border-strong bg-surface"
              />
              <Input value={color} onChange={(e) => setColor(e.target.value)} />
            </div>
          </div>

          {error && (
            <p className="rounded-control bg-error/10 px-3 py-2 text-sm text-error">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
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
