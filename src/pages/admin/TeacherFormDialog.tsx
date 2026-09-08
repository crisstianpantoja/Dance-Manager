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
import { Switch } from "@/components/ui/switch"
import { crearProfesor } from "@/lib/adminTeachers"
import { guardarSedesProfesor, listarSedesProfesor } from "@/lib/teacherAcademies"
import { subirFoto } from "@/lib/storage"
import { supabase } from "@/lib/supabase"
import type { Academy } from "@/types/academy"
import type { Teacher } from "@/types/teacher"

interface TeacherFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  profesor: Teacher | null
  academias: Academy[]
  onSaved: () => void
}

export function TeacherFormDialog({
  open,
  onOpenChange,
  profesor,
  academias,
  onSaved,
}: TeacherFormDialogProps) {
  const [nombre, setNombre] = useState("")
  const [documento, setDocumento] = useState("")
  const [contacto, setContacto] = useState("")
  const [rolInterno, setRolInterno] = useState("")
  const [foto, setFoto] = useState<string | null>(null)
  const [archivoFoto, setArchivoFoto] = useState<File | null>(null)
  const [activo, setActivo] = useState(true)
  const [academiaIds, setAcademiaIds] = useState<string[]>([])
  const [academiaPrincipal, setAcademiaPrincipal] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return

    setNombre(profesor?.nombre ?? "")
    setDocumento(profesor?.documento ?? "")
    setContacto(profesor?.contacto ?? "")
    setRolInterno(profesor?.rol_interno ?? "")
    setFoto(profesor?.foto ?? null)
    setArchivoFoto(null)
    setActivo(profesor?.activo ?? true)
    setError(null)

    if (profesor) {
      listarSedesProfesor(profesor.id)
        .then((sedes) => {
          setAcademiaIds(sedes.map((s) => s.academia_id))
          setAcademiaPrincipal(sedes.find((s) => s.is_primary)?.academia_id ?? null)
        })
        .catch(() => {
          setAcademiaIds([])
          setAcademiaPrincipal(null)
        })
    } else {
      setAcademiaIds([])
      setAcademiaPrincipal(null)
    }
  }, [open, profesor])

  function toggleAcademia(id: string) {
    setAcademiaIds((actual) => {
      const nuevo = actual.includes(id) ? actual.filter((a) => a !== id) : [...actual, id]
      if (!nuevo.includes(id) && academiaPrincipal === id) setAcademiaPrincipal(null)
      return nuevo
    })
  }

  async function handleSubmit(evento: FormEvent) {
    evento.preventDefault()
    setError(null)
    setGuardando(true)

    try {
      let fotoUrl = foto
      if (archivoFoto) {
        fotoUrl = await subirFoto(archivoFoto, "profesores")
      }

      let profesorId = profesor?.id

      if (profesor) {
        const { error } = await supabase
          .from("teachers")
          .update({ nombre, contacto, rol_interno: rolInterno, foto: fotoUrl, activo })
          .eq("id", profesor.id)
        if (error) throw error

        await supabase.from("profiles").update({ nombre }).eq("id", profesor.id)
      } else {
        const creado = await crearProfesor({
          nombre,
          documento,
          contacto,
          rol_interno: rolInterno,
          foto: fotoUrl,
        })
        profesorId = (creado as { id: string }).id
      }

      if (profesorId) {
        await guardarSedesProfesor(
          profesorId,
          academiaIds.map((id) => ({ academia_id: id, is_primary: id === academiaPrincipal })),
        )
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

          <div className="flex items-center justify-between rounded-control border border-white/10 px-3 py-2">
            <div>
              <Label htmlFor="activo">Activo</Label>
              <p className="text-xs text-text-muted">Aparece así en su carnet digital.</p>
            </div>
            <Switch id="activo" checked={activo} onCheckedChange={setActivo} />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Sedes donde trabaja</Label>
            {academias.length === 0 ? (
              <p className="text-sm text-text-muted">Aún no hay sedes registradas.</p>
            ) : (
              <div className="flex flex-col gap-1 rounded-control border border-white/10 p-2">
                {academias.map((academia) => {
                  const seleccionada = academiaIds.includes(academia.id)
                  return (
                    <div
                      key={academia.id}
                      className="flex items-center justify-between gap-2 px-2 py-1.5"
                    >
                      <label className="flex items-center gap-2 text-sm text-text">
                        <input
                          type="checkbox"
                          checked={seleccionada}
                          onChange={() => toggleAcademia(academia.id)}
                          className="size-4 accent-brand"
                        />
                        {academia.nombre}
                      </label>
                      {seleccionada && (
                        <label className="flex items-center gap-1.5 text-xs text-text-muted">
                          <input
                            type="radio"
                            name="academia-principal"
                            checked={academiaPrincipal === academia.id}
                            onChange={() => setAcademiaPrincipal(academia.id)}
                            className="size-3.5 accent-brand"
                          />
                          Principal
                        </label>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
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
