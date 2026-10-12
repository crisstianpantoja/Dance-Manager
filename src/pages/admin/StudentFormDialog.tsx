import { useEffect, useState, type FormEvent } from "react"
import { toast } from "sonner"

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
import { Switch } from "@/components/ui/switch"
import { crearAlumno, type PersonaExistente } from "@/lib/adminStudents"
import { subirFoto } from "@/lib/storage"
import { supabase } from "@/lib/supabase"
import { mensajeDeError } from "@/lib/errors"
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
  const [contactoEmergenciaNombre, setContactoEmergenciaNombre] = useState("")
  const [contactoEmergenciaTelefono, setContactoEmergenciaTelefono] = useState("")
  const [contactoEmergenciaParentesco, setContactoEmergenciaParentesco] = useState("")
  const [autorizaUsoImagen, setAutorizaUsoImagen] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [personaExistente, setPersonaExistente] = useState<PersonaExistente | null>(null)

  useEffect(() => {
    if (open) {
      setPersonaExistente(null)
      setNombre(alumno?.nombre ?? "")
      setDocumento(alumno?.documento ?? "")
      setContacto(alumno?.contacto ?? "")
      setTipo(alumno?.tipo ?? "academia")
      setNivel(alumno?.nivel ?? "Básica")
      setAcademiaId(alumno?.academia_id ?? SIN_ACADEMIA)
      setFoto(alumno?.foto ?? null)
      setArchivoFoto(null)
      setContactoEmergenciaNombre(alumno?.contacto_emergencia_nombre ?? "")
      setContactoEmergenciaTelefono(alumno?.contacto_emergencia_telefono ?? "")
      setContactoEmergenciaParentesco(alumno?.contacto_emergencia_parentesco ?? "")
      setAutorizaUsoImagen(alumno?.autoriza_uso_imagen ?? false)
      setError(null)
    }
  }, [open, alumno])

  async function handleSubmit(evento: FormEvent) {
    evento.preventDefault()
    await guardar(false)
  }

  async function guardar(confirmarAdjuntar: boolean) {
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
            contacto_emergencia_nombre: contactoEmergenciaNombre || null,
            contacto_emergencia_telefono: contactoEmergenciaTelefono || null,
            contacto_emergencia_parentesco: contactoEmergenciaParentesco || null,
            autoriza_uso_imagen: autorizaUsoImagen,
          })
          .eq("id", alumno.id)

        if (error) throw error

        await supabase.from("profiles").update({ nombre }).eq("id", alumno.id)
      } else {
        const resultado = await crearAlumno(
          {
            nombre,
            documento,
            contacto,
            tipo,
            nivel,
            academia_id,
            foto: fotoUrl,
            contacto_emergencia_nombre: contactoEmergenciaNombre || null,
            contacto_emergencia_telefono: contactoEmergenciaTelefono || null,
            contacto_emergencia_parentesco: contactoEmergenciaParentesco || null,
            autoriza_uso_imagen: autorizaUsoImagen,
          },
          confirmarAdjuntar,
        )

        if ("attach_candidate" in resultado) {
          setPersonaExistente(resultado.attach_candidate)
          setGuardando(false)
          return
        }

        if (resultado.password_generada) {
          const passwordGenerada = resultado.password_generada
          toast.success("Acceso creado", {
            description: `Documento: ${documento} · Contraseña inicial: ${passwordGenerada}. Compártesela al alumno.`,
            duration: Infinity,
            action: {
              label: "Copiar contraseña",
              onClick: () => {
                navigator.clipboard.writeText(passwordGenerada)
              },
            },
          })
        }
      }

      onSaved()
      onOpenChange(false)
    } catch (err) {
      setError(mensajeDeError(err, "No se pudo guardar el alumno."))
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

        {personaExistente ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-text">
              Ya existe <strong>{personaExistente.nombre}</strong> con este documento
              (rol actual: {personaExistente.rol}). ¿Agregarle también el rol de
              alumno?
            </p>

            {error && (
              <p className="rounded-control bg-error/10 px-3 py-2 text-sm text-error">
                {error}
              </p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPersonaExistente(null)}
              >
                Cancelar
              </Button>
              <Button type="button" disabled={guardando} onClick={() => guardar(true)}>
                {guardando ? "Guardando..." : "Confirmar"}
              </Button>
            </DialogFooter>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <Avatar>
              <AvatarImage src={foto ?? undefined} alt={nombre} />
              <AvatarFallback>{nombre.slice(0, 2).toUpperCase() || "AL"}</AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-col gap-1">
              <Label htmlFor="foto">Foto</Label>
              <input
                id="foto"
                type="file"
                accept="image/*"
                onChange={(e) => setArchivoFoto(e.target.files?.[0] ?? null)}
                className="w-full max-w-full text-sm text-text-muted file:mr-3 file:rounded-control file:border-0 file:bg-surface-hover file:px-3 file:py-1.5 file:text-sm file:text-text"
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
                  Se crea el acceso del alumno con este documento como usuario. Al
                  guardar te mostramos una contraseña inicial generada, para que se
                  la compartas.
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

          <div className="flex flex-col gap-2 rounded-control border border-border p-3">
            <p className="text-sm font-medium text-text">Contacto de emergencia</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 flex flex-col gap-2">
                <Label htmlFor="contactoEmergenciaNombre">Nombre</Label>
                <Input
                  id="contactoEmergenciaNombre"
                  value={contactoEmergenciaNombre}
                  onChange={(e) => setContactoEmergenciaNombre(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="contactoEmergenciaTelefono">Teléfono</Label>
                <Input
                  id="contactoEmergenciaTelefono"
                  value={contactoEmergenciaTelefono}
                  onChange={(e) => setContactoEmergenciaTelefono(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="contactoEmergenciaParentesco">Parentesco</Label>
                <Input
                  id="contactoEmergenciaParentesco"
                  placeholder="Mamá, papá, tutor..."
                  value={contactoEmergenciaParentesco}
                  onChange={(e) => setContactoEmergenciaParentesco(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-control border border-border px-3 py-2">
            <div>
              <Label htmlFor="autorizaUsoImagen">Permiso de uso de imagen</Label>
              <p className="text-xs text-text-muted">
                Autoriza el uso de su imagen en fotos/videos de la academia.
              </p>
            </div>
            <Switch
              id="autorizaUsoImagen"
              checked={autorizaUsoImagen}
              onCheckedChange={setAutorizaUsoImagen}
            />
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
        )}
      </DialogContent>
    </Dialog>
  )
}
