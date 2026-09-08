import { useState, type FormEvent } from "react"
import { Link, Navigate, useLocation } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/context/AuthContext"
import { AJUSTES_POR_DEFECTO } from "@/lib/settings"

export function LoginPage() {
  const { session, loading, signIn } = useAuth()
  // Marca genérica, no la de una academia específica: todas comparten
  // hoy la misma URL de login, así que no hay forma de saber de quién
  // es hasta autenticar (eso llega con el subdominio por academia).
  const ajustes = AJUSTES_POR_DEFECTO
  const location = useLocation()
  const [codigoAcademia, setCodigoAcademia] = useState("")
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

    const { error } = await signIn(documento, password, codigoAcademia)

    if (error) setError(error)
    setEnviando(false)
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm animate-fade-in-up">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-brand-light to-brand-dark text-2xl font-bold text-white shadow-lg shadow-brand/30 ring-1 ring-white/10">
            {ajustes.logo_url ? (
              <img src={ajustes.logo_url} alt={ajustes.nombre_app} className="size-full object-cover" />
            ) : (
              "DM"
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text">{ajustes.nombre_app}</h1>
            <p className="text-sm text-text-muted">
              Ingresa con el código de tu academia, tu documento y contraseña
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="codigoAcademia">Código de academia</Label>
                <Input
                  id="codigoAcademia"
                  name="codigoAcademia"
                  autoComplete="organization"
                  placeholder="Código de tu academia"
                  value={codigoAcademia}
                  onChange={(e) => setCodigoAcademia(e.target.value)}
                  required
                />
              </div>

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
