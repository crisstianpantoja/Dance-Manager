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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { crearAlumno } from "@/lib/adminStudents"
import { subirFoto } from "@/lib/storage"
import { supabase } from "@/lib/supabase"
import type { Academy } from "@/types/academy"
import type { NivelAlumno, Student, TipoAlumno } from "@/types/student"

interface StudentFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  alumno: Student | null
  academias: Academy[]
  onSaved: () => void
}

const SIN_ACADEMIA = "sin-academia"

export function StudentFormDialog({
  open,
  onOpenChange,
  alumno,
  academias,
  onSaved,
}: StudentFormDialogProps) {
  const [nombre, setNombre] = useState("")
  const [documento, setDocumento] = useState("")
  const [contacto, setContacto] = useState("")
  const [tipo, setTipo] = useState<TipoAlumno>("academia")
  const [nivel, setNivel] = useState<NivelAlumno>("Básica")
  const [academiaId, setAcademiaId] = useState<string>(SIN_ACADEMIA)
  const [foto, setFoto] = useState<string | null>(null)
  const [archivoFoto, setArchivoFoto] = useState<File | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setNombre(alumno?.nombre ?? "")
      setDocumento(alumno?.documento ?? "")
      setContacto(alumno?.contacto ?? "")
      setTipo(alumno?.tipo ?? "academia")
      setNivel(alumno?.nivel ?? "Básica")
      setAcademiaId(alumno?.academia_id ?? SIN_ACADEMIA)
      setFoto(alumno?.foto ?? null)
      setArchivoFoto(null)
      setError(null)
    }
  }, [open, alumno])

  async function handleSubmit(evento: FormEvent) {
    evento.preventDefault()
    setError(null)
    setGuardando(true)

    try {
      let fotoUrl = foto

      if (archivoFoto) {
        fotoUrl = await subirFoto(archivoFoto, "alumnos")
      }

      const academia_id = academiaId === SIN_ACADEMIA ? null : academiaId

      if (alumno) {
        const { error } = await supabase
          .from("students")
          .update({
            nombre,
            contacto,
            tipo,
            nivel,
            academia_id,
            foto: fotoUrl,
          })
          .eq("id", alumno.id)

        if (error) throw error

        await supabase.from("profiles").update({ nombre }).eq("id", alumno.id)
      } else {
        await crearAlumno({
          nombre,
          documento,
          contacto,
          tipo,
          nivel,
          academia_id,
          foto: fotoUrl,
        })
      }

      onSaved()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el alumno.")
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{alumno ? "Editar alumno" : "Nuevo alumno"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <Avatar>
              <AvatarImage src={foto ?? undefined} alt={nombre} />
              <AvatarFallback>{nombre.slice(0, 2).toUpperCase() || "AL"}</AvatarFallback>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 flex flex-col gap-2">
              <Label htmlFor="nombre">Nombre completo</Label>
              <Input
                id="nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
              />
            </div>

            <div className="col-span-2 flex flex-col gap-2">
              <Label htmlFor="documento">Documento</Label>
              <Input
                id="documento"
                value={documento}
                onChange={(e) => setDocumento(e.target.value)}
                disabled={!!alumno}
                required
              />
              {!alumno && (
                <p className="text-xs text-text-muted">
                  Se crea el acceso del alumno con este documento como usuario y
                  contraseña inicial.
                </p>
              )}
            </div>

            <div className="col-span-2 flex flex-col gap-2">
              <Label htmlFor="contacto">Contacto</Label>
              <Input
                id="contacto"
                placeholder="WhatsApp o teléfono"
                value={contacto}
                onChange={(e) => setContacto(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as TipoAlumno)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="academia">Academia</SelectItem>
                  <SelectItem value="privada">Privada</SelectItem>
                  <SelectItem value="ambas">Ambas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Nivel</Label>
              <Select value={nivel} onValueChange={(v) => setNivel(v as NivelAlumno)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Básica">Básica</SelectItem>
                  <SelectItem value="Intermedia">Intermedia</SelectItem>
                  <SelectItem value="Avanzada">Avanzada</SelectItem>
                </SelectContent>
              </Select>
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
