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
        .update({ contacto, foto: fotoUrl })
        .eq("id", alumno.id)

      if (error) throw error

      onSaved()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar los cambios.")
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
        err instanceof Error ? err.message : "No se pudo cambiar la contraseña.",
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
            <Label htmlFor="contacto">Contacto</Label>
            <Input
              id="contacto"
              placeholder="WhatsApp o teléfono"
              value={contacto}
              onChange={(e) => setContacto(e.target.value)}
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

        <div className="flex flex-col gap-3 border-t border-white/10 pt-4">
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
