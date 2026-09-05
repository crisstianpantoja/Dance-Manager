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
import { crearProfesor } from "@/lib/adminTeachers"
import { subirFoto } from "@/lib/storage"
import { supabase } from "@/lib/supabase"
import type { Teacher } from "@/types/teacher"

interface TeacherFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  profesor: Teacher | null
  onSaved: () => void
}

export function TeacherFormDialog({
  open,
  onOpenChange,
  profesor,
  onSaved,
}: TeacherFormDialogProps) {
  const [nombre, setNombre] = useState("")
  const [documento, setDocumento] = useState("")
  const [contacto, setContacto] = useState("")
  const [rolInterno, setRolInterno] = useState("")
  const [foto, setFoto] = useState<string | null>(null)
  const [archivoFoto, setArchivoFoto] = useState<File | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setNombre(profesor?.nombre ?? "")
      setDocumento(profesor?.documento ?? "")
      setContacto(profesor?.contacto ?? "")
      setRolInterno(profesor?.rol_interno ?? "")
      setFoto(profesor?.foto ?? null)
      setArchivoFoto(null)
      setError(null)
    }
  }, [open, profesor])

  async function handleSubmit(evento: FormEvent) {
    evento.preventDefault()
    setError(null)
    setGuardando(true)

    try {
      let fotoUrl = foto
      if (archivoFoto) {
        fotoUrl = await subirFoto(archivoFoto, "profesores")
      }

      if (profesor) {
        const { error } = await supabase
          .from("teachers")
          .update({ nombre, contacto, rol_interno: rolInterno, foto: fotoUrl })
          .eq("id", profesor.id)
        if (error) throw error

        await supabase.from("profiles").update({ nombre }).eq("id", profesor.id)
      } else {
        await crearProfesor({
          nombre,
          documento,
          contacto,
          rol_interno: rolInterno,
          foto: fotoUrl,
        })
      }

      onSaved()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el profesor.")
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{profesor ? "Editar profesor" : "Nuevo profesor"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <Avatar>
              <AvatarImage src={foto ?? undefined} alt={nombre} />
              <AvatarFallback>{nombre.slice(0, 2).toUpperCase() || "PR"}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-1">
              <Label htmlFor="foto">Foto</Label>
              <input
                id="foto"
                type="file"
                accept="image/*"
                onChange={(e) => setArchivoFoto(e.target.files?.[0] ?? null)}
                className="text-sm text-text-muted file:mr-3 file:rounded-control file:border-0 file:bg-surface-hover file:px-3 file:py-1.5 file:text-sm file:text-text"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="nombre">Nombre completo</Label>
            <Input
              id="nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="documento">Documento</Label>
            <Input
              id="documento"
              value={documento}
              onChange={(e) => setDocumento(e.target.value)}
              disabled={!!profesor}
              required
            />
            {!profesor && (
              <p className="text-xs text-text-muted">
                Se crea el acceso del profesor con este documento como usuario y
                contraseña inicial.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="contacto">Contacto</Label>
            <Input
              id="contacto"
              placeholder="WhatsApp o teléfono"
              value={contacto}
              onChange={(e) => setContacto(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="rolInterno">Rol interno</Label>
            <Input
              id="rolInterno"
              placeholder="Instructor, coordinador..."
              value={rolInterno}
              onChange={(e) => setRolInterno(e.target.value)}
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
