import { useState, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase"

export function UpdatePasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState("")
  const [confirmacion, setConfirmacion] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function handleSubmit(evento: FormEvent) {
    evento.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.")
      return
    }

    if (password !== confirmacion) {
      setError("Las contraseñas no coinciden.")
      return
    }

    setEnviando(true)
    const { error } = await supabase.auth.updateUser({ password })
    setEnviando(false)

    if (error) {
      setError("No pudimos actualizar la contraseña. Intenta de nuevo.")
      return
    }

    navigate("/login", { replace: true })
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm animate-fade-in-up">
        <h1 className="mb-6 text-center text-2xl font-bold text-text">
          Nueva contraseña
        </h1>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">Nueva contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="confirmacion">Confirmar contraseña</Label>
                <Input
                  id="confirmacion"
                  type="password"
                  autoComplete="new-password"
                  value={confirmacion}
                  onChange={(e) => setConfirmacion(e.target.value)}
                  required
                />
              </div>

              {error && (
                <p className="rounded-control bg-error/10 px-3 py-2 text-sm text-error">
                  {error}
                </p>
              )}

              <Button type="submit" disabled={enviando}>
                {enviando ? "Guardando..." : "Guardar contraseña"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
