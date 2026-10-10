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
import { subirFoto } from "@/lib/storage"
import { supabase } from "@/lib/supabase"
import { mensajeDeError } from "@/lib/errors"
import type { Student } from "@/types/student"

interface EditProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  alumno: Student
  onSaved: () => void
}

export function EditProfileDialog({
  open,
  onOpenChange,
  alumno,
  onSaved,
}: EditProfileDialogProps) {
  const [contacto, setContacto] = useState("")
  const [foto, setFoto] = useState<string | null>(null)
  const [archivoFoto, setArchivoFoto] = useState<File | null>(null)
  const [contactoEmergenciaNombre, setContactoEmergenciaNombre] = useState("")
  const [contactoEmergenciaTelefono, setContactoEmergenciaTelefono] = useState("")
  const [contactoEmergenciaParentesco, setContactoEmergenciaParentesco] = useState("")
  const [autorizaUsoImagen, setAutorizaUsoImagen] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [contrasenaActual, setContrasenaActual] = useState("")
  const [contrasenaNueva, setContrasenaNueva] = useState("")
  const [confirmarContrasena, setConfirmarContrasena] = useState("")
  const [cambiandoContrasena, setCambiandoContrasena] = useState(false)
  const [errorContrasena, setErrorContrasena] = useState<string | null>(null)
  const [exitoContrasena, setExitoContrasena] = useState(false)

  useEffect(() => {
    if (open) {
      setContacto(alumno.contacto ?? "")
      setFoto(alumno.foto)
      setArchivoFoto(null)
      setContactoEmergenciaNombre(alumno.contacto_emergencia_nombre ?? "")
      setContactoEmergenciaTelefono(alumno.contacto_emergencia_telefono ?? "")
      setContactoEmergenciaParentesco(alumno.contacto_emergencia_parentesco ?? "")
      setAutorizaUsoImagen(alumno.autoriza_uso_imagen ?? false)
      setError(null)
      setContrasenaActual("")
      setContrasenaNueva("")
      setConfirmarContrasena("")
      setErrorContrasena(null)
      setExitoContrasena(false)
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

      const { error } = await supabase
        .from("students")
        .update({
          contacto,
          foto: fotoUrl,
          contacto_emergencia_nombre: contactoEmergenciaNombre || null,
          contacto_emergencia_telefono: contactoEmergenciaTelefono || null,
          contacto_emergencia_parentesco: contactoEmergenciaParentesco || null,
          autoriza_uso_imagen: autorizaUsoImagen,
        })
        .eq("id", alumno.id)

      if (error) throw error

      onSaved()
      onOpenChange(false)
    } catch (err) {
      setError(mensajeDeError(err, "No se pudo guardar los cambios."))
    } finally {
      setGuardando(false)
    }
  }

  async function handleCambiarContrasena(evento: FormEvent) {
    evento.preventDefault()
    setErrorContrasena(null)
    setExitoContrasena(false)

    if (contrasenaNueva.length < 6) {
      setErrorContrasena("La nueva contraseña debe tener al menos 6 caracteres.")
      return
    }
    if (contrasenaNueva !== confirmarContrasena) {
      setErrorContrasena("Las contraseñas no coinciden.")
      return
    }

    setCambiandoContrasena(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user?.email) {
        setErrorContrasena("No se pudo verificar tu sesión.")
        return
      }

      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: contrasenaActual,
      })
      if (authError) {
        setErrorContrasena("La contraseña actual es incorrecta.")
        return
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: contrasenaNueva,
      })
      if (updateError) throw updateError

      setExitoContrasena(true)
      setContrasenaActual("")
      setContrasenaNueva("")
      setConfirmarContrasena("")
    } catch (err) {
      setErrorContrasena(
        mensajeDeError(err, "No se pudo cambiar la contraseña."),
      )
    } finally {
      setCambiandoContrasena(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar perfil</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="size-16">
              <AvatarImage src={foto ?? undefined} alt={alumno.nombre} />
              <AvatarFallback>{alumno.nombre.slice(0, 2).toUpperCase()}</AvatarFallback>
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

          <div className="flex flex-col gap-2">
            <Label htmlFor="contacto">Contacto</Label>
            <Input
              id="contacto"
              placeholder="WhatsApp o teléfono"
              value={contacto}
              onChange={(e) => setContacto(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2 rounded-control border border-border p-3">
            <p className="text-sm font-medium text-text">Contacto de emergencia</p>
            <div className="flex flex-col gap-2">
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

          <div className="flex items-center justify-between rounded-control border border-border px-3 py-2">
            <div>
              <Label htmlFor="autorizaUsoImagen">Permiso de uso de imagen</Label>
              <p className="text-xs text-text-muted">
                Autorizo el uso de mi imagen en fotos/videos de la academia.
              </p>
            </div>
            <Switch
              id="autorizaUsoImagen"
              checked={autorizaUsoImagen}
              onCheckedChange={setAutorizaUsoImagen}
            />
          </div>

          {error && (
            <p className="rounded-control bg-error/10 px-3 py-2 text-sm text-error">{error}</p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={guardando}>
              {guardando ? "Guardando..." : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </form>

        <div className="flex flex-col gap-3 border-t border-border pt-4">
          <p className="text-sm font-medium text-text">Cambiar contraseña</p>
          <form onSubmit={handleCambiarContrasena} className="flex flex-col gap-3">
            <Input
              type="password"
              placeholder="Contraseña actual"
              value={contrasenaActual}
              onChange={(e) => setContrasenaActual(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="Nueva contraseña"
              value={contrasenaNueva}
              onChange={(e) => setContrasenaNueva(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="Confirmar nueva contraseña"
              value={confirmarContrasena}
              onChange={(e) => setConfirmarContrasena(e.target.value)}
              required
            />
            {errorContrasena && (
              <p className="rounded-control bg-error/10 px-3 py-2 text-sm text-error">
                {errorContrasena}
              </p>
            )}
            {exitoContrasena && (
              <p className="rounded-control bg-success/10 px-3 py-2 text-sm text-success">
                Contraseña actualizada.
              </p>
            )}
            <Button type="submit" variant="outline" disabled={cambiandoContrasena}>
              {cambiandoContrasena ? "Cambiando..." : "Cambiar contraseña"}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
