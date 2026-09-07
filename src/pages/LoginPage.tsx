import { useState, type FormEvent } from "react"
import { Link, Navigate, useLocation } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/context/AuthContext"
import { useAppSettings } from "@/hooks/useAppSettings"

export function LoginPage() {
  const { session, loading, signIn } = useAuth()
  const ajustes = useAppSettings()
  const location = useLocation()
  const [documento, setDocumento] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  if (!loading && session) {
    const destino = (location.state as { from?: string } | null)?.from ?? "/"
    return <Navigate to={destino} replace />
  }

  async function handleSubmit(evento: FormEvent) {
    evento.preventDefault()
    setError(null)
    setEnviando(true)

    const { error } = await signIn(documento, password)

    if (error) setError(error)
    setEnviando(false)
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-control bg-gradient-to-br from-brand-light to-brand-dark text-2xl font-bold text-white">
            {ajustes.logo_url ? (
              <img src={ajustes.logo_url} alt={ajustes.nombre_app} className="size-full object-cover" />
            ) : (
              "DM"
            )}
          </div>
          <h1 className="text-2xl font-bold text-text">{ajustes.nombre_app}</h1>
          <p className="text-sm text-text-muted">Ingresa con tu documento y contraseña</p>
        </div>

        <Card>
          <CardHeader className="pb-0" />
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="documento">Documento</Label>
                <Input
                  id="documento"
                  name="documento"
                  autoComplete="username"
                  placeholder="Número de documento"
                  value={documento}
                  onChange={(e) => setDocumento(e.target.value)}
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {error && (
                <p className="rounded-control bg-error/10 px-3 py-2 text-sm text-error">
                  {error}
                </p>
              )}

              <Button type="submit" disabled={enviando} className="mt-2">
                {enviando ? "Ingresando..." : "Ingresar"}
              </Button>

              <Link
                to="/olvide-password"
                className="text-center text-sm text-text-muted transition-colors hover:text-brand-light"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
